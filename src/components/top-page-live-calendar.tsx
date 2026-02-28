"use client";

import { useState, useMemo } from "react";
import type { LiveEvent } from "@/types/database";
import Link from "next/link";
import Image from "next/image";

// 対応する年の日本の祝日リスト（YYYY-MM-DD）
const JAPAN_HOLIDAYS = new Set<string>([
  // 2025
  "2025-01-01",
  "2025-01-13",
  "2025-02-11",
  "2025-02-23",
  "2025-02-24",
  "2025-03-20",
  "2025-04-29",
  "2025-05-03",
  "2025-05-04",
  "2025-05-05",
  "2025-05-06",
  "2025-07-21",
  "2025-08-11",
  "2025-09-15",
  "2025-09-23",
  "2025-10-13",
  "2025-11-03",
  "2025-11-23",
  "2025-11-24",
  // 2026
  "2026-01-01",
  "2026-01-12",
  "2026-02-11",
  "2026-02-23",
  "2026-03-20",
  "2026-04-29",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  "2026-07-20",
  "2026-08-11",
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-10-12",
  "2026-11-03",
  "2026-11-23",
  // 2027
  "2027-01-01",
  "2027-01-11",
  "2027-02-11",
  "2027-02-23",
  "2027-03-21",
  "2027-03-22",
  "2027-04-29",
  "2027-05-03",
  "2027-05-04",
  "2027-05-05",
  "2027-07-19",
  "2027-08-11",
  "2027-09-20",
  "2027-09-23",
  "2027-10-11",
  "2027-11-03",
  "2027-11-23",
]);

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function TopPageLiveCalendar({ events }: { events: LiveEvent[] }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const map: Record<string, LiveEvent[]> = {};
    events.forEach((ev) => {
      const key = ev.event_date;
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => a.title.localeCompare(b.title)));
    return map;
  }, [events]);

  const calendarWeeks = useMemo(() => {
    const d = new Date(current.year, current.month, 1);
    const firstDay = d.getDay();
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const combined = [...blanks, ...days];
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < combined.length; i += 7) {
      weeks.push(combined.slice(i, i + 7));
    }
    return weeks;
  }, [current.year, current.month]);

  const prevMonth = () => {
    setCurrent((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
    );
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrent((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
    );
    setSelectedDate(null);
  };

  function getDateKey(day: number | null): string | null {
    if (day === null) return null;
    return `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  const monthLabel = `${current.year}年 ${current.month + 1}月`;

  return (
    <div className="space-y-4 w-full">
      {/* 月ナビ */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-surface-card hover:text-electric-blue transition-colors"
          aria-label="前月"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-white tabular-nums">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-surface-card hover:text-electric-blue transition-colors"
          aria-label="翌月"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-px text-center text-xs font-medium">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={`py-1 border border-surface-border bg-surface-card/50 ${
              i === 0 ? "text-red-400/90" : i === 6 ? "text-blue-400/90" : "text-gray-500"
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* 日付グリッド（各セルに枠） */}
      <div className="grid grid-cols-7 gap-px">
        {calendarWeeks.flat().map((day, i) => {
          const key = getDateKey(day);
          const count = key ? (eventsByDate[key]?.length ?? 0) : 0;
          const hasEvents = count > 0;
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const col = i % 7;
          const isSun = col === 0;
          const isSat = col === 6;
          const isHoliday = key ? JAPAN_HOLIDAYS.has(key) : false;

          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-[44px] border border-surface-border bg-surface-dark/30" />;
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={`
                relative flex min-h-[44px] flex-col items-center justify-center rounded-none
                border text-sm transition-all
                border-surface-border
                ${isSelected ? "bg-electric-blue/30 text-white border-electric-blue z-10" : "bg-surface-card/50"}
                ${!isSelected && hasEvents ? "text-gray-200 hover:bg-electric-blue/15 hover:border-electric-blue/40" : ""}
                ${!isSelected && !hasEvents ? "text-gray-400 hover:bg-surface-card hover:text-gray-200" : ""}
                ${isToday && !isSelected ? "border-electric-blue/60" : ""}
                ${!isSelected && (isSun || isHoliday) ? "text-red-400/90" : ""}
                ${!isSelected && !isHoliday && isSat ? "text-blue-400/80" : ""}
              `}
            >
              <span className="tabular-nums">{day}</span>
              {hasEvents && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-electric-blue/90 px-1.5 py-0.5 text-[10px] font-medium text-surface-dark leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 選択日の予定一覧 */}
      {selectedDate && (
        <div className="rounded-lg border border-electric-blue/20 bg-surface-card/60 p-4">
          <h4 className="text-sm font-medium text-electric-blue mb-3">
            {selectedDate.replace(/-/g, "/")} のライブ予定
          </h4>
          {selectedEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">この日の予定はありません。</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((ev) => {
                const handle = ev.profile_user_id ?? null;
                const displayName = ev.profile_display_name ?? null;
                const avatarUrl = ev.profile_avatar_url ?? null;
                const initial =
                  (displayName ?? handle ?? ev.user_id ?? "")
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?";
                return (
                  <li
                    key={ev.id}
                    className="rounded border border-surface-border/80 bg-surface-dark/40 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {handle ? (
                        <Link href={`/users/${encodeURIComponent(handle)}`} className="flex items-center gap-2 group">
                          <div className="relative h-7 w-7 overflow-hidden rounded-full bg-electric-blue/20 flex items-center justify-center text-xs font-bold text-electric-blue shrink-0">
                            {avatarUrl ? (
                              <Image
                                src={avatarUrl}
                                alt={displayName ?? `@${handle}`}
                                fill
                                sizes="28px"
                                className="object-cover"
                              />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <span className="text-sm text-electric-blue group-hover:underline">
                            {(displayName ?? "ユーザー") + `＠${handle} さん`}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {displayName ? `${displayName} さん` : "ユーザー さん"}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-white text-sm">{ev.title}</p>
                    {ev.venue && (
                      <p className="text-sm text-gray-400 mt-0.5">{ev.venue}</p>
                    )}
                    {ev.venue_url && (
                      <a
                        href={ev.venue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-electric-blue hover:underline mt-1 inline-block"
                      >
                        会場情報 →
                      </a>
                    )}
                    {ev.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {ev.description}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {events.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          まだライブ予定が登録されていません。マイページから追加できます。
        </p>
      )}
    </div>
  );
}
