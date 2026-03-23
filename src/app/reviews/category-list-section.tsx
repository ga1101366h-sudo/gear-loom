import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { isContentOnlyCategorySlug, getCategoryPathDisplay } from "@/data/post-categories";
import type { Review } from "@/types/database";
import { shouldUnoptimizeFirebaseStorage } from "@/lib/image-optimization";

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

function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
}

function getReviewExcerpt(r: Review): string {
  const bodyMd = (r.body_md ?? "").trim();
  if (bodyMd) {
    const snippet = bodyMd.replace(/\s+/g, " ").slice(0, 80);
    return snippet + (bodyMd.length > 80 ? "…" : "");
  }
  const bodyHtml = (r.body_html ?? "").trim();
  if (bodyHtml) {
    const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) {
      const snippet = text.slice(0, 80);
      return snippet + (text.length > 80 ? "…" : "");
    }
  }
  if (r.gear_name && r.gear_name.trim()) return r.gear_name.trim();
  return "";
}

export function CategoryListSection({
  title,
  reviews,
  emptyMessage,
}: {
  title: string;
  reviews: Review[];
  emptyMessage: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((r) => {
            const imageUrl = getFirstReviewImageUrl(r);
            const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
            const categorySlug = (r.categories && "slug" in r.categories && (r.categories as { slug: string }).slug)
              ? (r.categories as { slug: string }).slug
              : r.category_id;
            const categoryName = categorySlug ? getCategoryPathDisplay(categorySlug) : null;
            const excerpt = getReviewExcerpt(r);

            // /reviews/[id] でカテゴリ（ブログ/イベント）を正しくヘッダー表示するためのメインナビ上書き用
            const mainNav =
              r.category_id === "blog" || r.category_id === "event" ? r.category_id : null;
            const reviewHref = `/reviews/${r.id}${mainNav ? `?mainNav=${encodeURIComponent(mainNav)}` : ""}`;

            return (
              <li key={r.id}>
                <Card className="h-full overflow-hidden transition-all hover:border-electric-blue/50">
                  <Link href={reviewHref} className="block">
                    <div className="relative aspect-[16/9] w-full bg-surface-card overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          unoptimized={shouldUnoptimizeFirebaseStorage(imageUrl)}
                        />
                      ) : (
                        <Image
                          src={PLACEHOLDER_IMG}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          unoptimized
                        />
                      )}
                    </div>
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-sm font-bold leading-snug line-clamp-2">{r.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 flex-wrap text-xs pt-1">
                        <span>{r.gear_name}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-1 flex flex-col gap-1.5">
                      {showStars && <StarRating rating={r.rating} />}
                      {excerpt && (
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                          {excerpt}
                        </p>
                      )}
                    </CardContent>
                  </Link>
                  {categoryName && (
                    <div className="px-3 pb-3 -mt-1">
                      <Link
                        href={`/reviews?category=${encodeURIComponent(categorySlug)}`}
                        className="text-xs text-electric-blue hover:underline"
                      >
                        {categoryName}
                      </Link>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
