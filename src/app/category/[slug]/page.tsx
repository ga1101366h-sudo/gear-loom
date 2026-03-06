import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { isContentOnlyCategorySlug, isMainCategoryName, POST_CATEGORY_FLAT, normalizeCategorySlug, getCategoryLabel, getCategoryPathDisplay } from "@/data/post-categories";
import { getRakutenGenreIdForCategory } from "@/data/rakuten-genres";
import { getReviewsFromFirestore } from "@/lib/firebase/data";
import { fetchRakutenItemsByGenreId } from "@/lib/rakuten";
import type { Review } from "@/types/database";
import { CategoryCatalogSection, type CatalogItem } from "./CategoryCatalogSection";
import { SearchSidebar } from "./SearchSidebar";

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

/** URLで渡された slug をデコード（％エンコード・二重エンコード対策） */
function decodeSlug(slug: string): string {
  let s = slug;
  let prev = "";
  while (s.includes("%") && s !== prev) {
    prev = s;
    try {
      s = decodeURIComponent(s);
    } catch {
      break;
    }
  }
  return s;
}

/** 日本語の「大__中__小」形式なら最後の1つ（詳細名）を返し、それ以外は getCategoryLabel に任せる */
function getCategoryDisplayNameFromSlug(slug: string): string {
  const decoded = decodeSlug(slug);
  const parts = decoded.split("__").filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 1];
  if (parts.length === 2) return parts[1];
  if (parts.length === 1) return parts[0];
  return decoded;
}

function getCategoryNameBySlug(slug: string): string | null {
  const decoded = decodeSlug(slug);
  if (!decoded.trim()) return null;
  if (isMainCategoryName(decoded)) return decoded;
  const normalized = normalizeCategorySlug(decoded);
  const flat = Array.isArray(POST_CATEGORY_FLAT) ? POST_CATEGORY_FLAT : [];
  const fromFlat = flat.find((c) => c.slug === normalized)?.name_ja;
  if (fromFlat) return fromFlat;
  const fromLabel = getCategoryLabel(decoded);
  if (fromLabel && fromLabel !== decoded) return fromLabel;
  return getCategoryDisplayNameFromSlug(decoded);
}

function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
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

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ parent?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const decoded = decodeSlug(slug);
  const name = getCategoryNameBySlug(decoded);
  if (!name) return { title: "カテゴリ" };
  return { title: `${name} | カテゴリ`, description: `${name}のレビュー一覧と機材カタログ` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const { parent: parentFromUrl } = await searchParams;
  const slug = decodeSlug(rawSlug);
  const categoryName = getCategoryNameBySlug(slug);
  if (!categoryName) notFound();

  const parentParam =
    parentFromUrl != null && String(parentFromUrl).trim() !== ""
      ? decodeURIComponent(String(parentFromUrl).trim())
      : undefined;

  const [reviews, rakutenItems] = await Promise.all([
    getReviewsFromFirestore(undefined, slug, parentParam),
    fetchRakutenItemsByGenreId(getRakutenGenreIdForCategory(slug)),
  ]);

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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <SearchSidebar currentCategoryName={categoryName} parentFromUrl={parentParam} />
        <main className="min-w-0 flex-1 space-y-10">
      <h1 className="text-2xl font-bold text-white">{categoryName}</h1>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">みんなのレビュー</h2>
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              このカテゴリにはまだレビューがありません。下の機材カタログから「レビューを書く」で投稿してみませんか？
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {reviews.map((r) => {
              const imageUrl = getFirstReviewImageUrl(r);
              const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
              const catSlug = (r.categories && "slug" in r.categories && (r.categories as { slug: string }).slug)
                ? (r.categories as { slug: string }).slug
                : r.category_id;
              const catName = catSlug ? getCategoryPathDisplay(catSlug) : null;
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
                    {catName && (
                      <div className="px-3 pb-2">
                        <Link
                          href={`/category/${catSlug}`}
                          className="text-xs text-electric-blue hover:underline"
                        >
                          {catName}
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

      <CategoryCatalogSection
        categorySlug={slug}
        categoryNameJa={categoryName}
        catalogItems={catalogItems}
      />
        </main>
      </div>
    </div>
  );
}
