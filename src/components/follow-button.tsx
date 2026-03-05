"use client";

import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/use-follow";
import { cn } from "@/lib/utils";

type Props = {
  targetProfileUid: string;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
};

export function FollowButton({ targetProfileUid, onFollowChange, className }: Props) {
  const { isFollowing, toggle, loading, toggleLoading, canFollow } = useFollow(targetProfileUid);

  const handleClick = async () => {
    if (!canFollow || toggleLoading) return;
    const next = !isFollowing;
    await toggle();
    onFollowChange?.(next);
  };

  if (!canFollow) return null;
  if (loading) {
    return (
      <div className={cn("h-9 w-24 animate-pulse rounded-full bg-surface-card", className)} />
    );
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? "default" : "outline"}
      size="sm"
      className={cn(
        "rounded-full font-medium transition-colors",
        isFollowing
          ? "bg-cyan-600 text-white border-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.35)] hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_14px_rgba(34,211,238,0.45)]"
          : "border-cyan-500 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-400 hover:text-cyan-300",
        className
      )}
      onClick={handleClick}
      disabled={toggleLoading}
      aria-pressed={isFollowing}
      title={isFollowing ? "クリックでフォロー解除" : undefined}
    >
      {toggleLoading ? "..." : isFollowing ? "フォロー中" : "フォローする"}
    </Button>
  );
}
