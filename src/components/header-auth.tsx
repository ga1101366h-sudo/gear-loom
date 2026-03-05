"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUserId } from "@/lib/admin";
import { useUserProfile } from "@/hooks/use-user-profile";

export function HeaderAuth() {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { profile } = useUserProfile();
  const profileUserId = (profile?.user_id as string | null) ?? null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="h-9 w-24 animate-pulse rounded bg-surface-card" aria-hidden />
    );
  }

  const isAdmin = isAdminUserId(profileUserId);

  if (user) {
    return (
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {isAdmin && (
          <Link
            href="/admin"
            className="text-xs sm:text-sm text-gray-400 hover:text-electric-blue transition-all duration-200 hidden sm:inline"
          >
            管理者
          </Link>
        )}
        <Link
          href="/mypage"
          className="text-xs sm:text-sm text-gray-300 hover:text-electric-blue transition-all duration-200 px-1.5 py-1.5 sm:px-0 sm:py-0 min-h-[40px] sm:min-h-0 flex items-center whitespace-nowrap"
        >
          マイページ
        </Link>
        <Link
          href="/reviews/new"
          className="inline-flex items-center justify-center rounded-lg bg-electric-blue px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-surface-dark hover:bg-electric-blue-dim transition-all duration-300 hover:scale-105 hover:shadow-electric-glow shrink-0 whitespace-nowrap"
        >
          投稿する
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-xs sm:text-sm text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50 px-1.5 py-1.5 sm:px-0 sm:py-0 min-h-[40px] sm:min-h-0 flex items-center whitespace-nowrap"
        >
          {signingOut ? "…" : "ログアウト"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      <Link
        href="/signup"
        className="text-xs sm:text-sm font-medium text-electric-blue hover:text-electric-blue-dim transition-all duration-200 hover:drop-shadow-glow hidden sm:inline"
      >
        無料会員登録
      </Link>
      <Link
        href="/login"
        className="text-xs sm:text-sm text-gray-300 hover:text-electric-blue transition-all duration-200 hover:translate-y-[-1px] px-1.5 py-1.5 sm:px-0 sm:py-0 min-h-[40px] sm:min-h-0 flex items-center whitespace-nowrap"
      >
        ログイン
      </Link>
      <Link
        href="/login?next=/reviews/new"
        className="inline-flex items-center justify-center rounded-lg border border-electric-blue/50 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-electric-blue hover:bg-electric-blue/10 transition-all duration-300 shrink-0 whitespace-nowrap"
      >
        投稿する
      </Link>
    </div>
  );
}
