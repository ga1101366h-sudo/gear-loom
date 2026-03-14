"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit3, Layout } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUserId } from "@/lib/admin";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-electric-blue px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-surface-dark hover:bg-electric-blue-dim transition-all duration-300 hover:scale-105 hover:shadow-electric-glow shrink-0 whitespace-nowrap"
            >
              投稿する
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem asChild>
              <Link href="/reviews/new" className="flex items-center gap-2 cursor-pointer">
                <Edit3 className="h-4 w-4 shrink-0" aria-hidden />
                機材レビューを投稿
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/boards/publish" className="flex items-center gap-2 cursor-pointer">
                <Layout className="h-4 w-4 shrink-0" aria-hidden />
                エフェクターボードを投稿
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href="/login"
        className="text-xs sm:text-sm text-gray-400 hover:text-electric-blue transition-all duration-200 py-1.5 sm:py-2 min-h-[40px] sm:min-h-0 flex items-center whitespace-nowrap"
      >
        ログイン
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center justify-center rounded-lg bg-electric-blue px-3 py-2 text-xs sm:text-sm font-medium text-surface-dark hover:bg-electric-blue-dim transition-all duration-300 hover:shadow-electric-glow shrink-0 whitespace-nowrap"
      >
        無料会員登録
      </Link>
    </div>
  );
}
