"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShareToXButton } from "@/components/share-to-x-button";
import { Button } from "@/components/ui/button";
import { buildReviewShareText } from "@/lib/x-share";

export interface NewReviewItem {
  id: string;
  title: string;
  gear_name: string;
  maker_name?: string | null;
  rating: number;
  excerpt: string;
  image: string | null;
  category: string;
  author: string;
  /** 投稿者アバターURL（未設定時はイニシャル表示） */
  author_avatar: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-electric-blue" aria-label={`${rating}点`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "opacity-100" : "opacity-30"}>
          ★
        </span>
      ))}
    </span>
  );
}

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

function ReviewCard({ item }: { item: NewReviewItem }) {
  const shareText = buildReviewShareText({
    title: item.title,
    makerName: item.maker_name ?? undefined,
    gearName: item.gear_name,
    categoryNameJa: item.category,
  });
  return (
    <div className="relative shrink-0 w-[160px] sm:w-[220px] md:w-[280px] group snap-start">
      <Link href={`/reviews/${item.id}`} className="block">
        <Card className="card-hover h-full overflow-hidden">
          <div className="relative aspect-[400/260] w-full bg-surface-card overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 160px, (max-width: 768px) 220px, 280px"
            />
          ) : (
            <Image
              src={PLACEHOLDER_IMG}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 160px, (max-width: 768px) 220px, 280px"
              unoptimized
            />
          )}
        </div>
        <CardHeader className="pb-1 pt-2 sm:pb-2 px-2 sm:px-6">
          <CardTitle className="text-sm sm:text-base line-clamp-2 leading-tight">{item.title}</CardTitle>
          <CardDescription className="flex items-center gap-1 sm:gap-2 flex-wrap text-xs sm:text-sm">
            <span className="truncate">{item.gear_name}</span>
            <span className="text-electric-blue shrink-0">{item.category}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 sm:space-y-2 pt-0 px-2 sm:px-6 pb-2 sm:pb-6">
          {item.rating > 0 && <StarRating rating={item.rating} />}
          <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3">{item.excerpt}</p>
          {/* 投稿者アイコン＋名前 */}
          <div className="flex items-center gap-2 pt-1">
            {item.author_avatar ? (
              <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-surface-border bg-surface-card">
                <Image
                  src={item.author_avatar}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="24px"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-card border border-surface-border text-[10px] font-medium text-gray-500"
                aria-hidden
              >
                {(item.author || "?").charAt(0)}
              </div>
            )}
            <span className="min-w-0 truncate text-[10px] sm:text-xs text-gray-500">
              {item.author || "ユーザー"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
      <div
        className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="secondary" size="sm" asChild className="h-7 w-7 p-0 sm:h-auto sm:w-auto sm:px-2">
          <ShareToXButton
            path={`/reviews/${item.id}`}
            text={shareText}
            className="text-xs"
          />
        </Button>
      </div>
    </div>
  );
}

export function NewReviewsCarousel({ items }: { items: NewReviewItem[] }) {
  const enableAutoScroll = items.length >= 3;
  const displayItems = items;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);

  const scrollByOneCard = useCallback(
    (direction: "left" | "right", { pause }: { pause: boolean }) => {
      const container = scrollRef.current;
      if (!container) return;
      if (pause) setAutoScrollPaused(true);
      const firstItem = container.firstElementChild as HTMLElement | null;
      const itemWidth = firstItem?.getBoundingClientRect().width ?? 260;
      const style = window.getComputedStyle(container);
      const gap =
        parseFloat(style.columnGap || style.gap || "0") ||
        parseFloat(style.marginRight || "0");
      const delta = (itemWidth + gap) * (direction === "left" ? -1 : 1);
      container.scrollBy({ left: delta, behavior: "smooth" });
    },
    []
  );

  const scrollBy = useCallback(
    (direction: "left" | "right") => {
      scrollByOneCard(direction, { pause: true });
    },
    [scrollByOneCard]
  );

  useEffect(() => {
    if (!enableAutoScroll || autoScrollPaused) return;
    const intervalMs = 4000;
    const id = window.setInterval(() => {
      scrollByOneCard("right", { pause: false });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enableAutoScroll, autoScrollPaused, scrollByOneCard]);

  const pauseAutoScroll = () => {
    if (enableAutoScroll) setAutoScrollPaused(true);
  };

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      {enableAutoScroll && (
        <>
          <button
            type="button"
            onClick={() => scrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-card/90 border border-surface-border text-white shadow-lg flex items-center justify-center hover:bg-surface-card hover:border-electric-blue/50 hover:text-electric-blue transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue"
            aria-label="左へスクロール"
          >
            <span className="text-xl sm:text-2xl font-bold leading-none" aria-hidden>
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-card/90 border border-surface-border text-white shadow-lg flex items-center justify-center hover:bg-surface-card hover:border-electric-blue/50 hover:text-electric-blue transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue"
            aria-label="右へスクロール"
          >
            <span className="text-xl sm:text-2xl font-bold leading-none" aria-hidden>
              ›
            </span>
          </button>
        </>
      )}
      <div
        ref={scrollRef}
        role="region"
        aria-label="レビュー一覧"
        className="flex overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth min-w-0 w-full pl-3 sm:pl-4 pr-3 sm:pr-4 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
        onMouseEnter={pauseAutoScroll}
        onTouchStart={pauseAutoScroll}
      >
        {displayItems.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
