"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const MESSAGE_TYPE = "GEARLOOM_UPDATE_FOLLOW_COUNTS";

type Props = {
  userId: string;
  open: boolean;
  onClose: () => void;
  /** リアルタイムでプレビューに反映するフォロワー数（マイページ等から渡す） */
  followersCount?: number;
  /** リアルタイムでプレビューに反映するフォロー中数（マイページ等から渡す） */
  followingCount?: number;
};

function sendFollowCountsToFrame(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  followersCount: number | undefined,
  followingCount: number | undefined
) {
  const win = iframeRef.current?.contentWindow;
  if (!win) return;
  win.postMessage(
    {
      type: MESSAGE_TYPE,
      followersCount: typeof followersCount === "number" ? followersCount : undefined,
      followingCount: typeof followingCount === "number" ? followingCount : undefined,
    },
    "*"
  );
}

export function ProfilePreviewOverlay({
  userId,
  open,
  onClose,
  followersCount,
  followingCount,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const sendCounts = useCallback(() => {
    if (followersCount === undefined && followingCount === undefined) return;
    sendFollowCountsToFrame(iframeRef, followersCount, followingCount);
  }, [followersCount, followingCount]);

  useEffect(() => {
    if (!open) return;
    sendCounts();
  }, [open, followersCount, followingCount, sendCounts]);

  const handleIframeLoad = useCallback(() => {
    sendFollowCountsToFrame(iframeRef, followersCount, followingCount);
  }, [followersCount, followingCount]);

  if (!open || typeof document === "undefined") return null;

  const profileUrl = `/embed/users/${encodeURIComponent(userId)}`;

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="他の人から見たプロフィール"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl h-[85vh] max-h-[800px] flex flex-col rounded-xl border border-surface-border bg-surface overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0 px-4 py-2 border-b border-surface-border bg-surface-card">
          <span className="text-sm font-medium text-electric-blue">他の人からはこう見えます</span>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="閉じる">
            閉じる
          </Button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <iframe
            ref={iframeRef}
            src={profileUrl}
            title="公開プロフィールのプレビュー"
            className="w-full flex-1 min-h-0 border-0 rounded-b-xl"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
