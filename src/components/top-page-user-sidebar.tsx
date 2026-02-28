"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import type { ProfileListItem } from "@/lib/firebase/data";
import type { LiveEvent } from "@/types/database";

/** ログイン時のみ右サイドバーを表示。表示するのはログイン中ユーザー1人分のプロフィールのみ */
export function TopPageUserSidebarGate({
  users,
  liveEvents,
}: {
  users: ProfileListItem[];
  liveEvents: LiveEvent[];
}) {
  const { user, loading } = useAuth();
  const [fetchedProfile, setFetchedProfile] = useState<ProfileListItem | null>(null);

  const fromList = user ? users.find((u) => u.profile_id === user.uid) : null;
  const profile = fromList ?? fetchedProfile;

  useEffect(() => {
    if (!user?.uid || fromList) {
      setFetchedProfile(null);
      return;
    }
    const db = getFirebaseFirestore();
    if (!db) return;
    getDoc(doc(db, "profiles", user.uid)).then((snap) => {
      const data = snap.data();
      const user_id = (data?.user_id as string)?.trim();
      if (!user_id) {
        setFetchedProfile(null);
        return;
      }
      setFetchedProfile({
        profile_id: user.uid,
        user_id,
        display_name: (data?.display_name as string) ?? null,
        avatar_url: (data?.avatar_url as string) ?? null,
        owned_gear: (data?.owned_gear as string) ?? null,
        main_instrument: (data?.main_instrument as string) ?? null,
        bio: (data?.bio as string) ?? null,
        band_name: (data?.band_name as string) ?? null,
      });
    });
  }, [user?.uid, fromList]);

  if (loading) return null;
  if (!user) return null;
  if (!profile) return null;
  return <TopPageUserSidebar profile={profile} liveEvents={liveEvents} />;
}

function getOwnedGearLines(owned_gear: string | null, maxLines = 6): string[] {
  if (!owned_gear || !owned_gear.trim()) return [];
  const lines = owned_gear.trim().split(/\r?\n/).filter((s) => s.trim());
  return lines.slice(0, maxLines);
}

function truncate(s: string | null, len: number): string {
  if (!s || !s.trim()) return "";
  const t = s.trim();
  return t.length <= len ? t : t.slice(0, len) + "…";
}

/** 指定月のカレンダー日付と、イベントがある日付のセットを受け取りミニカレンダーを表示 */
function MiniCalendar({
  eventDates,
  year,
  month,
}: {
  eventDates: Set<string>;
  year: number;
  month: number;
}) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const daysInMonth = last.getDate();
  const startWeekday = first.getDay();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const monthStr = `${year}-${pad(month)}`;

  return (
    <div className="min-w-0">
      <p className="text-[10px] text-gray-500 mb-0.5">
        {year}年{month}月
      </p>
      <div className="grid grid-cols-7 gap-px text-center text-[10px]">
        {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
          <span key={w} className="text-gray-500 font-medium">
            {w}
          </span>
        ))}
        {weeks.flat().map((d, i) => {
          if (d === null)
            return <span key={`e-${i}`} className="invisible">0</span>;
          const dateStr = `${monthStr}-${pad(d)}`;
          const hasEvent = eventDates.has(dateStr);
          return (
            <span
              key={dateStr}
              className={`inline-flex items-center justify-center w-4 h-4 rounded ${
                hasEvent
                  ? "bg-electric-blue/30 text-electric-blue font-semibold"
                  : "text-gray-400"
              }`}
            >
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TopPageUserSidebar({
  profile,
  liveEvents,
}: {
  profile: ProfileListItem;
  liveEvents: LiveEvent[];
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const userEventDates = new Set(
    liveEvents
      .filter((ev) => ev.user_id === profile.profile_id)
      .map((ev) => ev.event_date || "")
      .filter(Boolean)
  );
  const ownedGearLines = getOwnedGearLines(profile.owned_gear);
  const bioShort = truncate(profile.bio, 80);

  return (
    <aside
      className="hidden lg:block shrink-0 pt-2 w-72"
      aria-label="マイプロフィール"
    >
      <nav
        className="w-full rounded-lg border border-surface-border bg-surface-card/80 py-4 px-3"
        aria-label="ログイン中のプロフィール"
      >
        <p className="px-2 pb-3 text-sm font-medium text-gray-400 border-b border-surface-border/50 mb-3">
          マイプロフィール
        </p>
        <Link
          href={`/users/${encodeURIComponent(profile.user_id)}`}
          className="block rounded-lg border border-surface-border/50 bg-surface-dark/40 p-3 hover:border-electric-blue/30 hover:bg-electric-blue/5 transition-all group"
          title={profile.display_name ? `${profile.display_name} @${profile.user_id}` : `@${profile.user_id}`}
        >
          <div className="flex gap-3 mb-2">
            <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-surface-border flex items-center justify-center ring-1 ring-surface-border">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-electric-blue/80 text-lg font-bold">
                  {(profile.display_name || profile.user_id).charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-100 group-hover:text-electric-blue truncate">
                {profile.display_name || `@${profile.user_id}`}
              </p>
              <p className="text-xs text-gray-500 truncate">@{profile.user_id}</p>
              {profile.main_instrument && (
                <p className="text-xs text-electric-blue/90 mt-0.5 truncate">
                  🎸 {truncate(profile.main_instrument, 18)}
                </p>
              )}
              {profile.band_name && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  ／ {truncate(profile.band_name, 18)}
                </p>
              )}
            </div>
          </div>
          {bioShort && (
            <div className="mb-2">
              <p className="text-[10px] text-gray-500 mb-0.5">自己紹介</p>
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                {bioShort}
              </p>
            </div>
          )}
          {ownedGearLines.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-gray-500 mb-0.5">所有機材</p>
              <ul className="text-xs text-gray-400 space-y-0.5 leading-relaxed">
                {ownedGearLines.map((line, i) => (
                  <li key={i} className="line-clamp-1">{line}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">ライブ日程</p>
            <MiniCalendar
              eventDates={userEventDates}
              year={currentYear}
              month={currentMonth}
            />
          </div>
          <p className="text-[10px] text-electric-blue/80 mt-2 text-right group-hover:text-electric-blue">
            プロフィールを見る →
          </p>
        </Link>
        <p className="px-2 pt-3 mt-2 text-xs text-gray-500 border-t border-surface-border/50">
          クリックでプロフィールページへ
        </p>
      </nav>
    </aside>
  );
}
