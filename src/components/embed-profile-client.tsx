"use client";

import { useState, useEffect } from "react";
import { PublicProfileView, type ReviewWithLikeCount } from "@/components/public-profile-view";
import type { Profile } from "@/types/database";
import type { LiveEvent } from "@/types/database";

const MESSAGE_TYPE = "GEARLOOM_UPDATE_FOLLOW_COUNTS";

type Props = {
  profile: Profile;
  events: LiveEvent[];
  reviews: ReviewWithLikeCount[];
  initialFollowersCount: number;
  initialFollowingCount: number;
};

export function EmbedProfileClient({
  profile,
  events,
  reviews,
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
      followersCount={initialFollowersCount}
      followingCount={initialFollowingCount}
      overrideFollowersCount={followersCount}
      overrideFollowingCount={followingCount}
      disableLinks
    />
  );
}
