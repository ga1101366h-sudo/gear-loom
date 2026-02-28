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

async function getReviews(categorySlug?: string): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    return await getReviewsFromFirestore(undefined, categorySlug);
  } catch {
    return [];
  }
}

function filterReviewsByQuery(reviews: Review[], query: string): Review[] {
  const q = query.trim().toLowerCase();
  if (!q) return reviews;
  return reviews.filter(
    (r) =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.gear_name && r.gear_name.toLowerCase().includes(q)) ||
      (r.maker_name && r.maker_name.toLowerCase().includes(q))
  );
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

function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
}

type Props = { searchParams: Promise<{ category?: string; q?: string }> };

export default async function ReviewsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const categorySlug = params.category;
  const searchQuery = params.q ?? "";
  const allReviews = await getReviews(categorySlug);
  const reviews = filterReviewsByQuery(allReviews, searchQuery);

  const title =
    searchQuery.trim()
      ? `「${searchQuery.trim()}」の検索結果`
      : categorySlug
        ? "レビュー一覧"
        : "レビュー一覧";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            {searchQuery.trim()
              ? "該当するレビューはありません。別のキーワードで検索してみてください。"
              : "まだレビューがありません。"}
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
                      <CardDescription className="flex flex-col gap-0.5 text-[11px]">
                        {!r.categories && r.maker_name && (
                          <span className="text-gray-400">{r.maker_name}</span>
                        )}
                        <span className="flex items-center gap-1 flex-wrap">
                          {r.maker_name && (
                            <span className="text-gray-400">{r.maker_name}</span>
                          )}
                          <span>{r.gear_name}</span>
                        </span>
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
