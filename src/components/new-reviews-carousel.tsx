"use client";

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

export interface NewReviewItem {
  id: string;
  title: string;
  gear_name: string;
  rating: number;
  excerpt: string;
  image: string | null;
  category: string;
  author: string;
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
  return (
    <div className="relative shrink-0 w-[160px] sm:w-[220px] md:w-[280px] group">
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
          {item.author && (
            <span className="text-[10px] sm:text-xs text-gray-500">{item.author}</span>
          )}
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
            text={item.title}
            className="text-xs"
          />
        </Button>
      </div>
    </div>
  );
}

export function NewReviewsCarousel({ items }: { items: NewReviewItem[] }) {
  const enableAutoScroll = items.length >= 3;
  const displayItems = enableAutoScroll ? [...items, ...items] : items;

  return (
    <div className="carousel-auto-slide relative w-full overflow-hidden">
      <div
        className={`flex gap-3 sm:gap-6 ${enableAutoScroll ? "new-reviews-scroll" : ""}`}
        style={enableAutoScroll ? { width: "max-content" } : undefined}
      >
        {displayItems.map((item, index) => (
          <ReviewCard
            key={enableAutoScroll ? `${item.id}-${index}` : item.id}
            item={item}
          />
        ))}
      </div>
    </div>
  );
}
