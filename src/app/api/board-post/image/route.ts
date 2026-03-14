import { NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";

const BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET ?? "";

/**
 * Firebase Storage の board-posts 画像をサーバー経由で返す。
 * 編集画面で既存画像が 403 等で表示されない場合に、Admin SDK で取得してプロキシする。
 * GET /api/board-post/image?u=ENCODED_FIREBASE_URL
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const u = searchParams.get("u");
    if (!u || typeof u !== "string") {
      return NextResponse.json({ error: "Missing u" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(decodeURIComponent(u.trim()));
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (parsed.hostname !== "firebasestorage.googleapis.com") {
      return NextResponse.json({ error: "Invalid host" }, { status: 400 });
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    const bIndex = segments.indexOf("b");
    const oIndex = segments.indexOf("o");
    if (
      bIndex === -1 ||
      oIndex === -1 ||
      bIndex + 1 >= segments.length ||
      oIndex + 1 >= segments.length
    ) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const bucketName = segments[bIndex + 1];
    const objectEncoded = segments[oIndex + 1];
    const objectPath = decodeURIComponent(objectEncoded);

    if (!bucketName || !objectPath || !objectPath.startsWith("board-posts/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (BUCKET && bucketName !== BUCKET) {
      return NextResponse.json({ error: "Bucket mismatch" }, { status: 400 });
    }

    const storage = getAdminStorage();
    if (!storage) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);

    const [downloadResult, metadataResult] = await Promise.all([
      file.download().catch((err) => {
        console.error("[GET /api/board-post/image] file.download failed", objectPath, err);
        throw err;
      }),
      file.getMetadata().catch(() => [null]),
    ]);

    const buffer = Array.isArray(downloadResult) ? downloadResult[0] : downloadResult;
    if (!Buffer.isBuffer(buffer)) {
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    const meta = Array.isArray(metadataResult) ? metadataResult[0] : metadataResult;
    const contentType =
      meta && typeof meta === "object" && "contentType" in meta
        ? String((meta as { contentType: string }).contentType)
        : "image/jpeg";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[GET /api/board-post/image]", err);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
