"use client";

import {
  collection,
  query,
  where,
  limit,
  getDocs,
  documentId,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { getFirebaseStorageUrl } from "@/lib/utils";

export type TimelineItemReview = {
  type: "review";
  id: string;
  created_at: string;
  author_id: string;
  title: string;
  gear_name: string;
  category_id: string;
  rating: number;
  review_images?: { storage_path: string; sort_order: number }[];
  category_name_ja?: string;
  profile_display_name?: string | null;
  profile_user_id?: string | null;
};
export type TimelineItemLiveEvent = {
  type: "live_event";
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  event_date: string;
  venue: string | null;
  profile_display_name?: string | null;
  profile_user_id?: string | null;
};
export type TimelineItem = TimelineItemReview | TimelineItemLiveEvent;

const FOLLOW_LIMIT = 30;
const CHUNK_SIZE = 10;

export async function fetchFollowingTimelineClient(myUid: string, limitItems = 50): Promise<TimelineItem[]> {
  const db = getFirebaseFirestore();
  if (!db || !myUid) return [];

  try {
  const followsSnap = await getDocs(
    query(
      collection(db, "follows"),
      where("follower_id", "==", myUid),
      limit(FOLLOW_LIMIT)
    )
  );
  const followingIds = followsSnap.docs
    .map((d) => d.data().following_id as string)
    .filter(Boolean);
  if (followingIds.length === 0) return [];

  const items: TimelineItem[] = [];

  for (let i = 0; i < followingIds.length; i += CHUNK_SIZE) {
    const chunk = followingIds.slice(i, i + CHUNK_SIZE);
    const reviewsSnap = await getDocs(
      query(
        collection(db, "reviews"),
        where("author_id", "in", chunk),
        limit(30)
      )
    );
    reviewsSnap.docs.forEach((d) => {
      const data = d.data();
      items.push({
        type: "review",
        id: d.id,
        created_at: (data.created_at as string) ?? "",
        author_id: (data.author_id as string) ?? "",
        title: (data.title as string) ?? "",
        gear_name: (data.gear_name as string) ?? "",
        category_id: (data.category_id as string) ?? "",
        rating: (data.rating as number) ?? 0,
        review_images: (data.review_images as { storage_path: string; sort_order: number }[]) ?? [],
        category_name_ja: data.category_name_ja as string | undefined,
      });
    });
  }

  for (let i = 0; i < followingIds.length; i += CHUNK_SIZE) {
    const chunk = followingIds.slice(i, i + CHUNK_SIZE);
    const eventsSnap = await getDocs(
      query(
        collection(db, "live_events"),
        where("user_id", "in", chunk),
        limit(20)
      )
    );
    eventsSnap.docs.forEach((d) => {
      const data = d.data();
      items.push({
        type: "live_event",
        id: d.id,
        created_at: (data.created_at as string) ?? "",
        user_id: (data.user_id as string) ?? "",
        title: (data.title as string) ?? "",
        event_date: (data.event_date as string) ?? "",
        venue: (data.venue as string) ?? null,
      });
    });
  }

  items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const trimmed = items.slice(0, limitItems);

  const authorUids = [...new Set(trimmed.map((x) => (x.type === "review" ? x.author_id : x.user_id)))].filter(Boolean);
  const profileMap = new Map<string, { display_name: string | null; user_id: string | null }>();
  for (let i = 0; i < authorUids.length; i += CHUNK_SIZE) {
    const chunk = authorUids.slice(i, i + CHUNK_SIZE);
    const profilesSnap = await getDocs(
      query(collection(db, "profiles"), where(documentId(), "in", chunk))
    );
    profilesSnap.docs.forEach((d) => {
      const data = d.data();
      profileMap.set(d.id, {
        display_name: (data.display_name as string) ?? null,
        user_id: (data.user_id as string) ?? null,
      });
    });
  }

  return trimmed.map((item) => {
    const uid = item.type === "review" ? item.author_id : item.user_id;
    const profile = uid ? profileMap.get(uid) : undefined;
    return {
      ...item,
      profile_display_name: profile?.display_name ?? null,
      profile_user_id: profile?.user_id ?? null,
    };
  });
  } catch {
    return [];
  }
}

export function getFirstReviewImageUrl(item: TimelineItemReview): string | null {
  if (!item.review_images?.length) return null;
  const first = [...item.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  return getFirebaseStorageUrl(first.storage_path) || null;
}
