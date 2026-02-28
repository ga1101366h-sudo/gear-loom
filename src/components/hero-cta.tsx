"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";

export function HeroCta() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<{
    uid: string;
    displayName: string | null;
    userId: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const db = getFirebaseFirestore();
  const fetchingUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !db) {
      setProfile(null);
      fetchingUidRef.current = null;
      return;
    }
    setProfile(null);
    const currentUid = user.uid;
    fetchingUidRef.current = currentUid;
    getDoc(doc(db, "profiles", currentUid))
      .then((snap) => {
        if (fetchingUidRef.current !== currentUid) return;
        const data = snap.data();
        const name = data?.display_name;
        const userId = data?.user_id;
        const avatar = data?.avatar_url;
        setProfile({
          uid: currentUid,
          displayName: typeof name === "string" && name.trim() ? name.trim() : null,
          userId: typeof userId === "string" && userId.trim() ? userId.trim() : null,
          avatarUrl: typeof avatar === "string" && avatar ? avatar : null,
        });
      })
      .catch(() => {
        if (fetchingUidRef.current === currentUid) setProfile(null);
      });
  }, [user?.uid, db]);

  if (loading) {
    return (
      <div className="flex flex-wrap justify-center gap-4">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-surface-card" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-card" />
        <div className="h-10 w-28 animate-pulse rounded-lg bg-surface-card" />
      </div>
    );
  }

  if (user) {
    // プロフィールは「今の user.uid 用に取得したもの」だけ表示（別ユーザのキャッシュが一瞬出るのを防ぐ）
    const isProfileForCurrentUser = profile?.uid === user.uid;
    const displayName = isProfileForCurrentUser && profile
      ? (profile.displayName ?? (user.displayName || user.email?.split("@")[0] || "ユーザー"))
      : (user.displayName || user.email?.split("@")[0] || "ユーザー");
    const accountLabel = isProfileForCurrentUser && profile?.userId
      ? `${displayName} @${profile.userId}`
      : displayName;
    const iconUrl = isProfileForCurrentUser ? profile?.avatarUrl ?? null : null;
    return (
      <div className="flex flex-wrap justify-center items-center gap-4">
        <Link
          href="/mypage"
          className="flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-electric-blue/50 transition-transform hover:scale-105"
          aria-label="マイページへ"
        >
          {iconUrl ? (
            <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden border-2 border-electric-blue/50 bg-surface-card ring-2 ring-surface-dark">
              <Image
                src={iconUrl}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 shrink-0 rounded-full border-2 border-electric-blue/50 bg-surface-card flex items-center justify-center text-sm font-bold text-electric-blue ring-2 ring-surface-dark"
              aria-hidden
            >
              {displayName.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <p className="text-gray-300 text-sm md:text-base">
            <span className="text-electric-blue font-medium">{accountLabel}</span>
            <span className="text-gray-400"> でログイン中</span>
          </p>
        </Link>
        <Button
          variant="outline"
          asChild
          className="transition-all duration-300 hover:scale-[1.02] hover:shadow-electric-glow"
        >
          <Link href="/reviews/new">投稿する</Link>
        </Button>
        <Button
          variant="ghost"
          asChild
          className="text-gray-400 hover:text-electric-blue text-sm"
        >
          <Link href="/mypage">マイページ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      <Button
        asChild
        className="transition-all duration-300 hover:scale-105 hover:shadow-electric-glow"
      >
        <Link href="/signup">無料会員登録</Link>
      </Button>
      <Button
        variant="secondary"
        asChild
        className="transition-all duration-300 hover:scale-[1.02] hover:border-electric-blue/30"
      >
        <Link href="/login">ログイン</Link>
      </Button>
      <Button
        variant="outline"
        asChild
        className="transition-all duration-300 hover:scale-[1.02] hover:shadow-electric-glow"
      >
        <Link href="/reviews/new">投稿する</Link>
      </Button>
    </div>
  );
}
