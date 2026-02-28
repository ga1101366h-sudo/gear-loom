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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => {
            const imageUrl = getFirstReviewImageUrl(r);
            const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
            return (
              <li key={r.id}>
                <Link href={`/reviews/${r.id}`}>
                  <Card className="h-full overflow-hidden transition-all hover:border-electric-blue/50">
                    <div className="relative aspect-[400/260] w-full bg-surface-card overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <Image
                          src={PLACEHOLDER_IMG}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base line-clamp-1">{r.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <span>{r.gear_name}</span>
                        {r.categories && "name_ja" in r.categories && (
                          <span className="text-electric-blue">
                            {(r.categories as { name_ja: string }).name_ja}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center">
                      {showStars && <StarRating rating={r.rating} />}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
