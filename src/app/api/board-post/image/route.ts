import { NextResponse } from "next/server";
import type { Readable } from "stream";
import { getAdminStorage } from "@/lib/firebase/admin";

function nodeStreamToWebReadableStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
  });
}

const BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET ?? "";

/**
 * Firebase Storage の board-posts 画像をサーバー経由で返す。
 * 編集画面で既存画像が 403 等で表示されない場合に、Admin SDK で取得してプロキシする。
 * GET /api/board-post/image?u=ENCODED_FIREBASE_URL
 */
export async function GET(request: Request) {
  try {
    const u = request.nextUrl.searchParams.get("u");
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

    const [metadata] = await file.getMetadata().catch(() => [null]);
    const contentType = metadata?.contentType ?? "image/jpeg";

    const nodeStream = file.createReadStream();
    const body = nodeStreamToWebReadableStream(nodeStream);

    return new NextResponse(body, {
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
