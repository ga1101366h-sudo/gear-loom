import { NextResponse } from "next/server";
import { getAboutPageCountsFromFirestore } from "@/lib/firebase/data";

export async function GET() {
  try {
    const counts = await getAboutPageCountsFromFirestore();
    return NextResponse.json(counts);
  } catch {
    return NextResponse.json(
      { reviews: 0, profiles: 0, notebookEntries: 0, liveEvents: 0 },
      { status: 500 }
    );
  }
}

