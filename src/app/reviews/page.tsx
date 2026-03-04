import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { isContentOnlyCategorySlug } from "@/data/post-categories";
import { RAKUTEN_GENRE_INSTRUMENTS } from "@/data/rakuten-genres";
import { fetchRakutenItems } from "@/lib/rakuten";
import type { Review } from "@/types/database";
import type { RakutenItem } from "@/types/rakuten";
import { SearchCatalogSection, type CatalogItem } from "./SearchCatalogSection";

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

  // カテゴリ付きのレビュー一覧URLに直接アクセスされた場合は
  // 新しい機材カタログ付きカテゴリページへリダイレクトする
  if (categorySlug) {
    redirect(`/category/${encodeURIComponent(categorySlug)}`);
  }

  const rawQuery = params.q ?? "";
  const searchQuery = rawQuery.trim();

  const [allReviews, rakutenItems] = await Promise.all([
    getReviews(undefined),
    searchQuery
      ? fetchRakutenItems(searchQuery, { genreId: RAKUTEN_GENRE_INSTRUMENTS })
      : Promise.resolve<RakutenItem[]>([]),
  ] as const);

  const reviews = filterReviewsByQuery(allReviews, searchQuery);

  const existingGearNames = new Set(
    reviews
      .map((r) => (r.gear_name ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const catalogItems: CatalogItem[] = rakutenItems
    .filter((item) => {
      const name = (item.itemName ?? "").trim().toLowerCase();
      if (!name) return false;
      if (existingGearNames.has(name)) return false;
      existingGearNames.add(name);
      return true;
    })
    .map((item) => ({
      itemName: item.itemName,
      itemUrl: item.itemUrl,
      affiliateUrl: item.affiliateUrl,
      imageUrl:
        item.mediumImageUrls?.[0]?.imageUrl ||
        item.smallImageUrls?.[0]?.imageUrl ||
        "",
      itemPrice: item.itemPrice,
      shopName: item.shopName,
    }));

  const title = searchQuery ? `「${searchQuery}」の検索結果` : "レビュー一覧";

  return (
    <div className="container mx-auto max-w-5xl space-y-10 px-4 py-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">みんなのレビュー</h2>
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              {searchQuery
                ? "該当するレビューはありません。下の機材カタログから「レビューを書く」で投稿してみませんか？"
                : "まだレビューがありません。"}
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {reviews.map((r) => {
              const imageUrl = getFirstReviewImageUrl(r);
              const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
              const slug =
                r.categories && "slug" in r.categories && (r.categories as { slug: string }).slug
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
                            sizes="(max-width:640px) 50vw, 25vw"
                          />
                        ) : (
                          <Image
                            src={PLACEHOLDER_IMG}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width:640px) 50vw, 25vw"
                            unoptimized
                          />
                        )}
                      </div>
                      <CardHeader className="p-3">
                        <CardTitle className="line-clamp-2 text-sm text-white">
                          {r.title}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-1 text-xs text-gray-400">
                          {r.maker_name && <span>{r.maker_name}</span>}
                          <span>{r.gear_name}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 pt-0">
                        {showStars && <StarRating rating={r.rating} />}
                      </CardContent>
                    </Link>
                    {categoryName && (
                      <div className="px-3 pb-2">
                        <Link
                          href={`/category/${encodeURIComponent(slug)}`}
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
      </section>

      {searchQuery && (
        <SearchCatalogSection keyword={searchQuery} catalogItems={catalogItems} />
      )}
    </div>
  );
}
