"use client";

import {
  collection,
  query,
  where,
  limit,
  getDocs,
  documentId,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";

export type FollowListItem = {
  uid: string;
  display_name: string | null;
  user_id: string | null;
  avatar_url: string | null;
};

const CHUNK_SIZE = 10;
const LIST_LIMIT = 50;

export async function getFollowCountsClient(myUid: string): Promise<{
  followingCount: number;
  followersCount: number;
}> {
  const db = getFirebaseFirestore();
  if (!db || !myUid) return { followingCount: 0, followersCount: 0 };
  try {
    const [followingSnap, followersSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", myUid)
        )
      ),
      getDocs(
        query(
          collection(db, "follows"),
          where("following_id", "==", myUid)
        )
      ),
    ]);
    return {
      followingCount: followingSnap.size,
      followersCount: followersSnap.size,
    };
  } catch {
    return { followingCount: 0, followersCount: 0 };
  }
}

async function fetchProfilesMap(
  db: Firestore,
  uids: string[]
): Promise<Map<string, FollowListItem>> {
  const map = new Map<string, FollowListItem>();
  for (let i = 0; i < uids.length; i += CHUNK_SIZE) {
    const chunk = uids.slice(i, i + CHUNK_SIZE);
    const snap = await getDocs(
      query(collection(db, "profiles"), where(documentId(), "in", chunk))
    );
    snap.docs.forEach((d) => {
      const data = d.data();
      map.set(d.id, {
        uid: d.id,
        display_name: (data.display_name as string) ?? null,
        user_id: (data.user_id as string) ?? null,
        avatar_url: (data.avatar_url as string) ?? null,
      });
    });
  }
  return map;
}

export async function fetchFollowingListClient(
  myUid: string
): Promise<FollowListItem[]> {
  const db = getFirebaseFirestore();
  if (!db || !myUid) return [];
  try {
    const followsSnap = await getDocs(
      query(
        collection(db, "follows"),
        where("follower_id", "==", myUid),
        limit(LIST_LIMIT)
      )
    );
    const followingIds = followsSnap.docs
      .map((d) => d.data().following_id as string)
      .filter(Boolean);
    if (followingIds.length === 0) return [];
    const profileMap = await fetchProfilesMap(db, followingIds);
    return followingIds
      .map((uid) => profileMap.get(uid))
      .filter((p): p is FollowListItem => p != null);
  } catch {
    return [];
  }
}

export async function fetchFollowersListClient(
  myUid: string
): Promise<FollowListItem[]> {
  const db = getFirebaseFirestore();
  if (!db || !myUid) return [];
  try {
    const followsSnap = await getDocs(
      query(
        collection(db, "follows"),
        where("following_id", "==", myUid),
        limit(LIST_LIMIT)
      )
    );
    const followerIds = followsSnap.docs
      .map((d) => d.data().follower_id as string)
      .filter(Boolean);
    if (followerIds.length === 0) return [];
    const profileMap = await fetchProfilesMap(db, followerIds);
    return followerIds
      .map((uid) => profileMap.get(uid))
      .filter((p): p is FollowListItem => p != null);
  } catch {
    return [];
  }
}
