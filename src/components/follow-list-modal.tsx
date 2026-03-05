"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FollowButton } from "@/components/follow-button";
import {
  fetchFollowingListClient,
  fetchFollowersListClient,
  type FollowListItem,
} from "@/lib/firebase/follow-list-client";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "following" | "followers";
  myUid: string | null;
  onUnfollow?: (uid: string) => void;
  /** フォロワー一覧でフォローボタンを押してフォローしたときに呼ばれ、親でフォロー中カウントを+1する */
  onFollow?: () => void;
};

function FollowListItemRow({
  item,
  onUnfollow,
  onFollow,
  showUnfollowHint,
}: {
  item: FollowListItem;
  onUnfollow?: () => void;
  onFollow?: () => void;
  showUnfollowHint?: boolean;
}) {
  const profileHref = item.user_id ? `/users/${encodeURIComponent(item.user_id)}` : null;
  const displayLabel = item.display_name || item.user_id || "ユーザー";
  const handleFollowChange = (isFollowing: boolean) => {
    if (!isFollowing && showUnfollowHint) onUnfollow?.();
    if (isFollowing) onFollow?.();
  };
  return (
    <li className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-card/50 px-3 py-2">
      {item.avatar_url ? (
        <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden bg-surface-card">
          <Image src={item.avatar_url} alt="" fill className="object-cover" sizes="40px" unoptimized />
        </div>
      ) : (
        <div className="w-10 h-10 shrink-0 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-electric-blue font-bold text-sm">
          {displayLabel.charAt(0).toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {profileHref ? (
          <Link href={profileHref} className="font-medium text-white hover:text-electric-blue truncate block">
            {displayLabel}
          </Link>
        ) : (
          <span className="font-medium text-white truncate block">{displayLabel}</span>
        )}
        {item.user_id && (
          <p className="text-xs text-gray-500 truncate">@{item.user_id}</p>
        )}
      </div>
      <FollowButton
        targetProfileUid={item.uid}
        onFollowChange={handleFollowChange}
        className="shrink-0"
      />
    </li>
  );
}

export function FollowListModal({ open, onClose, mode, myUid, onUnfollow, onFollow }: Props) {
  const [list, setList] = useState<FollowListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !myUid) {
      setList([]);
      return;
    }
    setLoading(true);
    const fetcher = mode === "following" ? fetchFollowingListClient : fetchFollowersListClient;
    fetcher(myUid)
      .then(setList)
      .finally(() => setLoading(false));
  }, [open, mode, myUid]);

  if (!open) return null;

  const title = mode === "following" ? "フォロー中" : "フォロワー";
  const emptyMessage =
    mode === "following"
      ? "フォローしているユーザーはいません。"
      : "フォロワーはいません。";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${title}一覧`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-electric-blue">{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            閉じる
          </Button>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500 text-sm py-4">読み込み中...</p>
          ) : list.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">{emptyMessage}</p>
          ) : (
            <ul className="space-y-2">
              {list.map((item) => (
                <FollowListItemRow
                  key={item.uid}
                  item={item}
                  showUnfollowHint={mode === "following"}
                  onUnfollow={
                    mode === "following"
                      ? () => {
                          setList((prev) => prev.filter((x) => x.uid !== item.uid));
                          onUnfollow?.(item.uid);
                        }
                      : undefined
                  }
                  onFollow={mode === "followers" ? onFollow : undefined}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
