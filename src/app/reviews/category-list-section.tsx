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
import { isContentOnlyCategorySlug } from "@/data/post-categories";
import type { Review } from "@/types/database";

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
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {reviews.map((r) => {
            const imageUrl = getFirstReviewImageUrl(r);
            const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
            const categorySlug = (r.categories && "slug" in r.categories && (r.categories as { slug: string }).slug)
              ? (r.categories as { slug: string }).slug
              : r.category_id;
            const categoryName = r.categories && "name_ja" in r.categories
              ? (r.categories as { name_ja: string }).name_ja
              : null;
            return (
              <li key={r.id}>
                <Card className="h-full overflow-hidden transition-all hover:border-electric-blue/50">
                  <Link href={`/reviews/${r.id}`} className="block">
                    <div className="relative aspect-[2/1] w-full bg-surface-card overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                        />
                      ) : (
                        <Image
                          src={PLACEHOLDER_IMG}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                          unoptimized
                        />
                      )}
                    </div>
                    <CardHeader className="p-2 pb-0">
                      <CardTitle className="text-xs line-clamp-1">{r.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 flex-wrap text-[11px]">
                        <span>{r.gear_name}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 pt-0 pb-1.5 flex items-center">
                      {showStars && <StarRating rating={r.rating} />}
                    </CardContent>
                  </Link>
                  {categoryName && (
                    <div className="px-2 pb-1.5 -mt-0.5">
                      <Link
                        href={`/reviews?category=${encodeURIComponent(categorySlug)}`}
                        className="text-[11px] text-electric-blue hover:underline"
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
