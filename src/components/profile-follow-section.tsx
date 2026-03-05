"use client";

import { useState } from "react";
import { FollowButton } from "@/components/follow-button";

type Props = {
  profileUid: string;
  initialFollowersCount: number;
  initialFollowingCount: number;
  /** 親から渡すリアルタイムのフォロワー数（プレビューiframe用） */
  overrideFollowersCount?: number;
  /** 親から渡すリアルタイムのフォロー中数（プレビューiframe用） */
  overrideFollowingCount?: number;
};

export function ProfileFollowSection({
  profileUid,
  initialFollowersCount,
  initialFollowingCount,
  overrideFollowersCount,
  overrideFollowingCount,
}: Props) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);

  const handleFollowChange = (isFollowing: boolean) => {
    setFollowersCount((c) => (isFollowing ? c + 1 : Math.max(0, c - 1)));
  };

  const displayFollowers = overrideFollowersCount !== undefined ? overrideFollowersCount : followersCount;
  const displayFollowing = overrideFollowingCount !== undefined ? overrideFollowingCount : initialFollowingCount;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <FollowButton targetProfileUid={profileUid} onFollowChange={handleFollowChange} />
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span><span className="font-semibold text-white">{displayFollowers}</span> フォロワー</span>
        <span><span className="font-semibold text-white">{displayFollowing}</span> フォロー中</span>
      </div>
    </div>
  );
}
