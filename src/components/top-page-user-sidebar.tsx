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

/** PCサイドバー用：表示する行数と「他N件」用の総数 */
function getOwnedGearSummary(
  owned_gear: string | null,
  displayMaxLines = 2,
  lineMaxChars = 28
): { lines: string[]; totalCount: number; hasMore: boolean } {
  if (!owned_gear || !owned_gear.trim()) {
    return { lines: [], totalCount: 0, hasMore: false };
  }
  const all = owned_gear.trim().split(/\r?\n/).filter((s) => s.trim());
  const totalCount = all.length;
  const lines = all.slice(0, displayMaxLines).map((line) =>
    line.length <= lineMaxChars ? line : line.slice(0, lineMaxChars) + "…"
  );
  return { lines, totalCount, hasMore: totalCount > displayMaxLines };
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
  const ownedGearSummary = getOwnedGearSummary(profile.owned_gear, 2, 26);
  const bioShort = truncate(profile.bio, 80);

  return (
    <>
      {/* スマホ・タブレット：コンパクトなマイプロフィールバー（メイン上部に表示するため page 側で挿入） */}
      <aside
        className="lg:hidden shrink-0 w-full mb-4"
        aria-label="マイプロフィール"
      >
        <nav
          className="w-full rounded-lg border border-surface-border bg-surface-card/80 py-3 px-3"
          aria-label="ログイン中のプロフィール"
        >
          <p className="px-2 pb-2 text-xs font-medium text-gray-400 border-b border-surface-border/50 mb-2">
            マイプロフィール
          </p>
          <Link
            href="/mypage"
            className="flex items-center gap-3 rounded-lg border border-surface-border/50 bg-surface-dark/40 p-2.5 hover:border-electric-blue/30 hover:bg-electric-blue/5 transition-all group"
            title="マイページへ"
          >
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-surface-border flex items-center justify-center ring-1 ring-surface-border">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-electric-blue/80 text-sm font-bold">
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
                <p className="text-xs text-electric-blue/90 truncate">
                  🎸 {truncate(profile.main_instrument, 16)}
                </p>
              )}
            </div>
            <span className="text-xs text-electric-blue/80 shrink-0 group-hover:text-electric-blue">
              見る →
            </span>
          </Link>
        </nav>
      </aside>

      {/* PC：従来の右サイドバー */}
      <aside
        className="hidden lg:block shrink-0 pt-2 w-72"
        aria-label="マイプロフィール（詳細）"
      >
        <nav
          className="w-full rounded-lg border border-surface-border bg-surface-card/80 py-4 px-3"
          aria-label="ログイン中のプロフィール"
        >
          <p className="px-2 pb-3 text-sm font-medium text-gray-400 border-b border-surface-border/50 mb-3">
            マイプロフィール
          </p>
          <Link
            href="/mypage"
            className="block rounded-lg border border-surface-border/50 bg-surface-dark/40 p-3 hover:border-electric-blue/30 hover:bg-electric-blue/5 transition-all group"
            title="マイページへ"
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
            {ownedGearSummary.lines.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-gray-500 mb-0.5">所有機材</p>
                <ul className="text-xs text-gray-400 space-y-0.5 leading-snug line-clamp-2">
                  {ownedGearSummary.lines.map((line, i) => (
                    <li key={i} className="truncate">{line}</li>
                  ))}
                </ul>
                {ownedGearSummary.hasMore && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    他{ownedGearSummary.totalCount - 2}件（プロフィールで全て表示）
                  </p>
                )}
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
    </>
  );
}
