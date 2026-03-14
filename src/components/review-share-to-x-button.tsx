"use client";

import { X } from "lucide-react";
import { ShareToXButton } from "@/components/share-to-x-button";
import { buildReviewShareText } from "@/lib/x-share";
import { useAuth } from "@/contexts/AuthContext";

type ReviewShareToXButtonProps = {
  reviewId: string;
  title: string;
  makerName?: string | null;
  gearName?: string | null;
  categoryNameJa?: string | null;
  categorySlug?: string | null;
  /** レビュー投稿者の Firebase UID */
  authorUid: string;
  className?: string;
};

export function ReviewShareToXButton({
  reviewId,
  title,
  makerName,
  gearName,
  categoryNameJa,
  categorySlug,
  authorUid,
  className,
}: ReviewShareToXButtonProps) {
  const { user } = useAuth();
  const isOwner = !!user && user.uid === authorUid;

  const text = buildReviewShareText({
    title,
    makerName: makerName ?? undefined,
    gearName: gearName ?? undefined,
    categoryNameJa: categoryNameJa ?? undefined,
    categorySlug: categorySlug ?? undefined,
    sharedByOwner: isOwner,
  });

  const path = `/reviews/${reviewId}`;

  return (
    <ShareToXButton
      path={path}
      text={text}
      className={className ?? "inline-flex h-full w-full items-center justify-center gap-1.5 text-white"}
    >
      <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">でポスト</span>
    </ShareToXButton>
  );
}

