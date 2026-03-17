import { NextResponse } from "next/server";
import { getAboutPageCountsFromFirestore } from "@/lib/firebase/data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [firestoreCounts, boardPostCount] = await Promise.all([
      getAboutPageCountsFromFirestore(),
      prisma.boardPost.count({ where: { isPublic: true } }),
    ]);
    const counts = { ...firestoreCounts, boardPosts: boardPostCount };
    return NextResponse.json(counts);
  } catch {
    return NextResponse.json(
      { reviews: 0, profiles: 0, notebookEntries: 0, liveEvents: 0, boardPosts: 0 },
      { status: 500 }
    );
  }
}

