import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminAuth, getAdminStorage } from "@/lib/firebase/admin";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

/**
 * みんなのボード投稿用の実機写真をアップロードする。
 * 認証必須。Firebase Storage の board-posts/{uid}/ 配下に保存し、公開URLを返す。
 */
export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    } catch (err) {
      console.error("[board-post/upload] Token verification error:", err);
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image") as Blob | File | null;

    if (!image || image.size === 0) {
      return NextResponse.json({ error: "画像（image）は必須です" }, { status: 400 });
    }

    const storage = getAdminStorage();
    if (!storage) {
      console.error("[board-post/upload] Storage not configured");
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 環境変数で明示されていればそれを優先し、なければ Firebase のデフォルトバケットを利用する。
    const explicitBucketName =
      process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = explicitBucketName ? storage.bucket(explicitBucketName) : storage.bucket();
    const bucketName = bucket.name;
    const filename = `${randomUUID()}.webp`;
    const storagePath = `board-posts/${uid}/${filename}`;
    const buffer = Buffer.from(await (image as Blob).arrayBuffer());

    const file = bucket.file(storagePath);
    const downloadToken = randomUUID();
    await file.save(buffer, {
      contentType: (image as File).type || "image/webp",
      resumable: false,
      // Firebase Storage の「ダウンロード URL」は metadata.metadata.firebaseStorageDownloadTokens に
      // トークンを設定すると /v0/b/.../o/...?...&token=XXX で 403 にならず取得できる。
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      storagePath,
    )}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/board-post/upload] Error:", err);
    return NextResponse.json(
      { error: "画像の保存に失敗しました" },
      { status: 500 }
    );
  }
}
