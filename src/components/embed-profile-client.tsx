"use client";

import { useState, useEffect } from "react";
import { PublicProfileView, type ReviewWithLikeCount } from "@/components/public-profile-view";
import type { PublicBoardItem } from "@/lib/board-public";
import type { Profile } from "@/types/database";
import type { LiveEvent } from "@/types/database";
import type { UserGearItem } from "@/types/gear";

const MESSAGE_TYPE = "GEARLOOM_UPDATE_FOLLOW_COUNTS";

type Props = {
  profile: Profile;
  events: LiveEvent[];
  reviews: ReviewWithLikeCount[];
  gears?: UserGearItem[];
  boards?: PublicBoardItem[];
  boardPosts?: {
    id: string;
    title: string;
    boardName: string;
    updatedAt: string;
    thumbnailUrl: string | null;
    likeCount?: number;
  }[];
  initialBoardLikes?: number;
  initialFollowersCount: number;
  initialFollowingCount: number;
};

export function EmbedProfileClient({
  profile,
  events,
  reviews,
  gears = [],
  boards = [],
  boardPosts = [],
  initialBoardLikes = 0,
  initialFollowersCount,
  initialFollowingCount,
}: Props) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);

  useEffect(() => {
    setFollowersCount(initialFollowersCount);
    setFollowingCount(initialFollowingCount);
  }, [initialFollowersCount, initialFollowingCount]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== MESSAGE_TYPE) return;
      if (typeof e.data.followersCount === "number") setFollowersCount(e.data.followersCount);
      if (typeof e.data.followingCount === "number") setFollowingCount(e.data.followingCount);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <PublicProfileView
      profile={profile}
      events={events}
      reviews={reviews}
      gears={gears}
      boards={boards}
      boardPosts={boardPosts}
      totalBoardLikes={initialBoardLikes}
      followersCount={initialFollowersCount}
      followingCount={initialFollowingCount}
      overrideFollowersCount={followersCount}
      overrideFollowingCount={followingCount}
      disableLinks
    />
  );
}
