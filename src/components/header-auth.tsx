"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { isAdminUserId } from "@/lib/admin";

export function HeaderAuth() {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProfileUserId(null);
      return;
    }
    const db = getFirebaseFirestore();
    if (!db) return;
    getDoc(doc(db, "profiles", user.uid)).then((snap) => {
      const data = snap.data();
      setProfileUserId((data?.user_id as string) ?? null);
    });
  }, [user?.uid]);

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
      <div className="flex items-center gap-2 shrink-0">
        {isAdmin && (
          <Link
            href="/admin"
            className="text-sm text-gray-400 hover:text-electric-blue transition-all duration-200"
          >
            管理者
          </Link>
        )}
        <Link
          href="/mypage"
          className="text-sm text-gray-300 hover:text-electric-blue transition-all duration-200"
        >
          マイページ
        </Link>
        <Link
          href="/reviews/new"
          className="inline-flex items-center justify-center rounded-lg bg-electric-blue px-3 py-2 text-sm font-medium text-surface-dark hover:bg-electric-blue-dim transition-all duration-300 hover:scale-105 hover:shadow-electric-glow"
        >
          投稿する
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          {signingOut ? "ログアウト中..." : "ログアウト"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href="/signup"
        className="text-sm font-medium text-electric-blue hover:text-electric-blue-dim transition-all duration-200 hover:drop-shadow-glow"
      >
        無料会員登録
      </Link>
      <Link
        href="/login"
        className="text-sm text-gray-300 hover:text-electric-blue transition-all duration-200 hover:translate-y-[-1px]"
      >
        ログイン
      </Link>
      <Link
        href="/login?next=/reviews/new"
        className="inline-flex items-center justify-center rounded-lg border border-electric-blue/50 px-3 py-2 text-sm font-medium text-electric-blue hover:bg-electric-blue/10 transition-all duration-300"
      >
        投稿する
      </Link>
    </div>
  );
}
