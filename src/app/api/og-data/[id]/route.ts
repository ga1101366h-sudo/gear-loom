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

    return NextResponse.json({
      actualPhotoUrl: boardPost.board.actualPhotoUrl ?? null,
      thumbnail: boardPost.board.thumbnail ?? null,
    });
  } catch (error) {
    console.error("OG API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
