import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const boardPost = await prisma.boardPost.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!boardPost || !boardPost.board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const board = boardPost.board;
    let actualPhotoUrl = board.actualPhotoUrl?.trim() || null;
    let thumbnail = board.thumbnail?.trim() || null;

    // 実機写真・サムネイルがどちらもない場合は、投稿の追加画像（imageUrls）の1枚目をフォールバック
    if (!actualPhotoUrl && !thumbnail && boardPost.imageUrls) {
      try {
        const parsed = JSON.parse(boardPost.imageUrls) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          const url = typeof first === "string" ? first.trim() : null;
          if (url) actualPhotoUrl = url;
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      actualPhotoUrl,
      thumbnail,
    });
  } catch (error) {
    console.error("OG API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
