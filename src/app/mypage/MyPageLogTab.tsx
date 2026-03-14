"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveEventCalendar } from "@/components/live-event-calendar";
import {
  getFirstReviewImageUrl as getTimelineReviewImageUrlFromApi,
  type TimelineItem,
} from "@/lib/firebase/follow-timeline-client";
import {
  CarouselNav,
  StarRating,
  ReviewListItem,
  EMPTY_SECTION_CLASS,
  CAROUSEL_PAGE_SIZE,
  PLACEHOLDER_IMG,
  getFirstReviewImageUrl,
  isContentOnlyCategorySlug,
} from "./mypage-shared";
import type { Review } from "@/types/database";
import type { LiveEvent } from "@/types/database";

function getTimelineReviewImageUrlFromItem(item: TimelineItem): string | null {
  if (item.type !== "review") return null;
  return getTimelineReviewImageUrlFromApi(item);
}

type Props = {
  likedReviews: Review[];
  liveEvents: LiveEvent[];
  sortedCalendarEvents: LiveEvent[];
  timelineItems: TimelineItem[];
};

export function MyPageLogTab({
  likedReviews,
  liveEvents,
  sortedCalendarEvents,
  timelineItems,
}: Props) {
  const [likedPage, setLikedPage] = useState(0);
  const [calendarPage, setCalendarPage] = useState(0);
  const [timelinePage, setTimelinePage] = useState(0);

  return (
    <div className="space-y-12">
      {/* マイスケジュール（カレンダー） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">マイスケジュール（カレンダー）</CardTitle>
          <CardDescription>
            ライブ予定を追加してカレンダーで管理（直近の予定順）
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[120px]">
          {sortedCalendarEvents.length > 0 ? (
            <>
              <ul className="space-y-2 mb-4">
                {sortedCalendarEvents
                  .slice(
                    calendarPage * CAROUSEL_PAGE_SIZE,
                    calendarPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE
                  )
                  .map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-surface-border bg-surface-card/50 px-3 py-2"
                    >
                      <p className="font-medium text-white text-sm truncate">{ev.title}</p>
                      <p className="text-xs text-gray-400">
                        {ev.event_date
                          ? new Date(ev.event_date).toLocaleDateString("ja-JP")
                          : ""}
                        {ev.venue && ` · ${ev.venue}`}
                      </p>
                    </li>
                  ))}
              </ul>
              <CarouselNav
                currentPage={calendarPage}
                totalPages={Math.max(
                  1,
                  Math.ceil(sortedCalendarEvents.length / CAROUSEL_PAGE_SIZE)
                )}
                onPrev={() => setCalendarPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setCalendarPage((p) =>
                    Math.min(
                      Math.ceil(sortedCalendarEvents.length / CAROUSEL_PAGE_SIZE) - 1,
                      p + 1
                    )
                  )
                }
              />
              <div className="mt-4 pt-4 border-t border-surface-border">
                <LiveEventCalendar initialEvents={liveEvents} />
              </div>
            </>
          ) : (
            <LiveEventCalendar initialEvents={liveEvents} />
          )}
        </CardContent>
      </Card>

      {/* フォロー中ユーザーの記事 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">フォロー中ユーザーの記事</CardTitle>
          <CardDescription>
            フォローしているユーザーの最新レビュー・ブログ・ライブ日程を時系列で表示
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-gray-500 text-sm">
                まだフォローしているユーザーがいないか、アクティビティがありません。プロフィールページからユーザーをフォローしてみましょう。
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {timelineItems
                  .slice(
                    timelinePage * CAROUSEL_PAGE_SIZE,
                    timelinePage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE
                  )
                  .map((item) => {
                    if (item.type === "review") {
                      const imageUrl = getTimelineReviewImageUrlFromItem(item);
                      const showStars =
                        !isContentOnlyCategorySlug(item.category_id) && item.rating > 0;
                      const authorLabel = item.profile_display_name
                        ? item.profile_user_id
                          ? `${item.profile_display_name} @${item.profile_user_id}`
                          : item.profile_display_name
                        : "ユーザー";
                      return (
                        <li key={`review-${item.id}`}>
                          <Link
                            href={`/reviews/${item.id}`}
                            className="flex gap-3 rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden hover:border-cyan-500/50 transition-colors"
                          >
                            <div className="relative w-24 shrink-0 aspect-[400/260] bg-surface-card">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="96px"
                                  unoptimized
                                />
                              ) : (
                                <Image
                                  src={PLACEHOLDER_IMG}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="96px"
                                  unoptimized
                                />
                              )}
                            </div>
                            <div className="min-w-0 py-3 pr-3 flex-1">
                              <p className="font-medium text-white line-clamp-1">{item.title}</p>
                              <p className="text-sm text-gray-400">{item.gear_name}</p>
                              <p className="text-xs text-gray-500 mt-1">{authorLabel}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {showStars && <StarRating rating={item.rating} />}
                                <span className="text-xs text-gray-500">
                                  {item.category_name_ja ?? ""}
                                  {" · "}
                                  {item.created_at
                                    ? new Date(item.created_at).toLocaleDateString("ja-JP")
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    }
                    const authorLabel = item.profile_display_name
                      ? item.profile_user_id
                        ? `${item.profile_display_name} @${item.profile_user_id}`
                        : item.profile_display_name
                      : "ユーザー";
                    return (
                      <li key={`event-${item.id}`}>
                        <div className="rounded-lg border border-surface-border bg-surface-card/50 px-3 py-3">
                          <p className="text-xs text-cyan-400/90 font-medium">ライブ予定</p>
                          <p className="font-medium text-white mt-0.5">{item.title}</p>
                          <p className="text-sm text-gray-400">
                            {item.event_date
                              ? new Date(item.event_date).toLocaleDateString("ja-JP")
                              : ""}
                            {item.venue && ` · ${item.venue}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{authorLabel}</p>
                        </div>
                      </li>
                    );
                  })}
              </ul>
              <CarouselNav
                currentPage={timelinePage}
                totalPages={Math.max(
                  1,
                  Math.ceil(timelineItems.length / CAROUSEL_PAGE_SIZE)
                )}
                onPrev={() => setTimelinePage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setTimelinePage((p) =>
                    Math.min(
                      Math.ceil(timelineItems.length / CAROUSEL_PAGE_SIZE) - 1,
                      p + 1
                    )
                  )
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* お気に入りした記事 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">お気に入りした記事</CardTitle>
          <CardDescription>いいねしたレビュー一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {likedReviews.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-gray-500 text-sm">まだいいねした記事がありません。</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {likedReviews
                  .slice(
                    likedPage * CAROUSEL_PAGE_SIZE,
                    likedPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE
                  )
                  .map((r) => {
                    const imageUrl = getFirstReviewImageUrl(r);
                    const showStars =
                      !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
                    return (
                      <ReviewListItem
                        key={r.id}
                        r={r}
                        imageUrl={imageUrl}
                        showStars={showStars}
                      />
                    );
                  })}
              </ul>
              <CarouselNav
                currentPage={likedPage}
                totalPages={Math.max(
                  1,
                  Math.ceil(likedReviews.length / CAROUSEL_PAGE_SIZE)
                )}
                onPrev={() => setLikedPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setLikedPage((p) =>
                    Math.min(
                      Math.ceil(likedReviews.length / CAROUSEL_PAGE_SIZE) - 1,
                      p + 1
                    )
                  )
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
