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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ShareToXButton } from "@/components/share-to-x-button";
import { Button } from "@/components/ui/button";
import { buildReviewShareText } from "@/lib/x-share";
import { formatCategoryPath } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export interface NewReviewItem {
  id: string;
  title: string;
  gear_name: string;
  maker_name?: string | null;
  rating: number;
  excerpt: string;
  image: string | null;
  category: string;
  /** Firestore の category_slug（X共有時のハッシュタグ用） */
  category_slug?: string | null;
  author: string;
  /** 投稿者アバターURL（未設定時はイニシャル表示） */
  author_avatar: string | null;
  /** レビュー投稿者の Firebase UID（Xシェア文分岐用） */
  author_uid?: string | null;
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

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

function ReviewCard({ item }: { item: NewReviewItem }) {
  const { user } = useAuth();
  const isOwner = !!user && !!item.author_uid && user.uid === item.author_uid;

  const shareText = isOwner
    ? buildReviewShareText({
        title: item.title,
        makerName: item.maker_name ?? undefined,
        gearName: item.gear_name,
        categorySlug: item.category_slug ?? undefined,
        categoryNameJa: item.category,
        sharedByOwner: true,
      })
    : buildReviewShareText({
        title: item.title,
        makerName: item.maker_name ?? undefined,
        gearName: item.gear_name,
        categorySlug: item.category_slug ?? undefined,
        categoryNameJa: item.category,
        sharedByOwner: false,
      });

  return (
    <div className="relative group flex h-full">
      <Link href={`/reviews/${item.id}`} className="block flex-1 min-w-0">
        <Card className="card-hover h-full flex flex-col overflow-hidden">
          <div className="relative w-full shrink-0 overflow-hidden bg-surface-card h-[120px] sm:h-[150px] md:h-[160px]">
            {item.image ? (
              <Image
                src={item.image}
                alt=""
                fill
                className="object-cover object-center w-full h-full transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 160px, (max-width: 768px) 220px, 280px"
              />
            ) : (
              <Image
                src={PLACEHOLDER_IMG}
                alt=""
                fill
                className="object-cover object-center w-full h-full"
                sizes="(max-width: 640px) 160px, (max-width: 768px) 220px, 280px"
                unoptimized
              />
            )}
          </div>
          <CardHeader className="pb-1 pt-2 sm:pb-2 px-2 sm:px-6">
            <CardTitle className="text-sm sm:text-base line-clamp-2 leading-tight">
              {item.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 sm:gap-2 flex-wrap text-xs sm:text-sm">
              <span className="truncate">{item.gear_name}</span>
              <span className="text-electric-blue shrink-0">
                {formatCategoryPath(item.category)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col pt-0 px-2 sm:px-6 pb-2 sm:pb-6">
            <div className="space-y-1 sm:space-y-2 flex-1">
              {item.rating > 0 && <StarRating rating={item.rating} />}
              <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3">
                {item.excerpt}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
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
        <Button
          variant="secondary"
          size="sm"
          asChild
          className="h-7 w-7 p-0 sm:h-auto sm:w-auto sm:px-2"
        >
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
  return (
    <Carousel
      opts={{ align: "start", loop: false }}
      className="w-full min-w-0 pl-10 pr-10 sm:pl-12 sm:pr-12"
      role="region"
      aria-label="レビュー一覧"
    >
      <CarouselContent className="-ml-4">
        {items.map((item) => (
          <CarouselItem
            key={item.id}
            className="w-[160px] sm:w-[220px] md:w-[280px] shrink-0 pl-4"
          >
            <ReviewCard item={item} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
