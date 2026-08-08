import { cache } from "react";
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
import {
  isContentOnlyCategorySlug,
  getCategoryPathDisplay,
  getCategoryHref,
  resolveCategoryNameBySlug,
  toCanonicalCategorySlug,
  decodeCategorySlug,
  isKnownCategorySlug,
} from "@/data/post-categories";
import { getRakutenGenreIdForCategory } from "@/data/rakuten-genres";
import { getReviewsFromFirestore } from "@/lib/firebase/data";
import { fetchRakutenItemsByGenreId } from "@/lib/rakuten";
import type { Review } from "@/types/database";
import { CategoryCatalogSection, type CatalogItem } from "./CategoryCatalogSection";
import { SearchSidebar } from "./SearchSidebar";

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

/**
 * URLで渡された slug をデコード（％エンコード・二重エンコード対策）。
 * ★実体は data/post-categories.ts の decodeCategorySlug に一本化してある（2026-08-09 第3弾A）。
 *   以前はここに同じ内容の関数が複製されていたが、middleware 側と食い違う余地を無くすため統合した。
 */
function decodeSlug(slug: string): string {
  return decodeCategorySlug(slug);
}

/**
 * slug から表示名を解決する。実在しないカテゴリなら null（＝ notFound() で 404）。
 * 解決ロジックの本体は data/post-categories.ts。
 *
 * ★2段構えになっている理由（2026-08-09 第3弾A）
 *   `resolveCategoryNameBySlug()` は前後の空白を trim してから照合するため、
 *   `/category/ギター ` `/category/オーバー ドライブ` のような**異表記も名前を返してしまう**。
 *   第1弾で「どこからもリンクされていない無限の異表記URLは404にする」と決めており、
 *   その厳密判定は `isKnownCategorySlug()`（＝正規表記そのものか、区切り全除去形か）が持っている。
 *   以前この判定は middleware 側にあったが、第3弾Aで middleware の404回避策を撤去したため、
 *   **同じ関数をページ側から直接呼ぶ形に移した**（判定ロジックは1本のまま＝DRY）。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_再レビュー.md ②(5)
 */
function getCategoryNameBySlug(slug: string): string | null {
  if (!isKnownCategorySlug(slug)) return null;
  return resolveCategoryNameBySlug(decodeSlug(slug));
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

/**
 * generateMetadata と本体で同じレビュー取得が2回走らないようにする（同一リクエスト内でのみ共有）。
 */
const getCategoryReviews = cache(
  async (slug: string, parentParam?: string): Promise<Review[]> =>
    getReviewsFromFirestore(undefined, slug, parentParam)
);

function normalizeParentParam(parentFromUrl?: string): string | undefined {
  if (parentFromUrl == null || String(parentFromUrl).trim() === "") return undefined;
  try {
    return decodeURIComponent(String(parentFromUrl).trim());
  } catch {
    return String(parentFromUrl).trim();
  }
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { parent: parentFromUrl } = await searchParams;
  const decoded = decodeSlug(slug);
  const name = getCategoryNameBySlug(decoded);
  // ★実在しないカテゴリは notFound() で落とす。**これがHTTP 404 の発生源**（2026-08-09 第3弾A）
  //   かつては この notFound() を呼んでも HTTPステータスが 200 のまま（＝ソフト404）だった。
  //   真因は Next.js のストリーミング仕様一般ではなく、このリポジトリの `src/app/loading.tsx` が
  //   ルート直下に Suspense 境界を作り、シェルが先に送出されていたこと
  //   （レビュアー役が Next.js 15.1.9 の最小再現アプリで loading.tsx の有無だけを変える A/B を実施し、
  //     あり=200／なし=404 を実測。出典：
  //     C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②B）。
  //   ★第3弾Aで `src/app/loading.tsx` を削除したので、この notFound() がそのまま 404 になる。
  //     middleware 側の404回避策は撤去済み（＝**もうカテゴリの404は middleware に依存していない**）。
  //     `/gears/*`・`/boards/post/*`・`/users/*` など他ルートのソフト404も同時に解消した。
  if (!name) notFound();

  // レビューが1件も無いカテゴリは noindex にする（2026-08-03）
  // 理由：Search Console 実測で「クロール済み - インデックス未登録」が117ページあり、
  //       レビュー0件のカテゴリページは共通ヘッダー・フッター以外に本文が無い状態だった。
  //       中身の無いページをインデックス対象に残すと、サイト全体の評価を下げる方向に働く。
  //       follow は残すので、機材カタログ側へのリンクはたどられる。
  //       レビューが1件でも付けば自動的に index に戻る（除外リストは持たない）。
  //       ★判定基準は sitemap.ts のカテゴリ絞り込みと同じ（「そのカテゴリのレビューが0件か」）。
  let hasReview = false;
  try {
    const reviews = await getCategoryReviews(decoded, normalizeParentParam(parentFromUrl));
    hasReview = reviews.length > 0;
  } catch (err) {
    // 取得に失敗したときは noindex にしない（一時的な障害でインデックスを落とさないため）
    console.error("[category/generateMetadata] レビュー件数の取得に失敗", err);
    hasReview = true;
  }

  return {
    title: `${name} | カテゴリ`,
    description: `${name}のレビュー一覧と機材カタログ`,
    // ?parent= の有無で別URL扱いされないよう、正規URLはクエリなしに固定する。
    // ★さらに、同じカテゴリの2系統URL（日本語式／ローマ字式）を1本に寄せる（2026-08-08 第2弾A）。
    //   通常は middleware が 308 で寄せるので日本語式でここに到達しないが、
    //   middleware が走らない経路に対する保険として canonical 側でも正規化しておく。
    alternates: {
      canonical: `/category/${encodeURIComponent(toCanonicalCategorySlug(decoded) ?? decoded)}`,
    },
    ...(hasReview ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const { parent: parentFromUrl } = await searchParams;
  const slug = decodeSlug(rawSlug);
  const categoryName = getCategoryNameBySlug(slug);
  if (!categoryName) notFound();

  const parentParam = normalizeParentParam(parentFromUrl);

  const [reviews, rakutenItems] = await Promise.all([
    getCategoryReviews(slug, parentParam),
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
              // 内部リンクは必ず正規URL（ローマ字式）を指す＝sitemap と同じURLを推す
              const catHref = catSlug ? getCategoryHref(catSlug) : null;
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
                        {catHref ? (
                          <Link
                            href={catHref}
                            className="text-xs text-electric-blue hover:underline"
                          >
                            {catName}
                          </Link>
                        ) : (
                          // 正規URLに解決できないカテゴリはリンクにしない（壊れたリンクを出さない）
                          <span className="text-xs text-gray-400">{catName}</span>
                        )}
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
