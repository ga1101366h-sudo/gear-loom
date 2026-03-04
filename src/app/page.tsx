import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NewReviewsCarousel,
  type NewReviewItem,
} from "@/components/new-reviews-carousel";
import { TopPageLiveCalendar } from "@/components/top-page-live-calendar";
import {
  TopPageCategoryNav,
  TopPageCategoryNavMobile,
} from "@/components/top-page-category-nav";
import { TopPageMainNavMobile } from "@/components/top-page-main-nav-mobile";
import { TopPageUserSidebarGate } from "@/components/top-page-user-sidebar";
import { NearbySpotsMap } from "@/components/nearby-spots-map";
import { HeroSlideshow } from "@/components/hero-slideshow";
import {
  getExternalNewsForTopPage,
  type ExternalNewsItem,
} from "@/lib/news";
import { getProfilesListForTopPage } from "@/lib/firebase/data";
import type { Review, LiveEvent } from "@/types/database";

/** トップページは常に最新のレビュー・人気機材を表示するため、キャッシュせず毎回サーバーで描画する */
export const dynamic = "force-dynamic";

const EXCLUDED_FROM_MAIN_SECTIONS = ["event", "blog"];

async function getRecentReviews(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    const all = await getReviewsFromFirestore(50);
    return all
      .filter((r) => !EXCLUDED_FROM_MAIN_SECTIONS.includes(r.category_id))
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function getPopularReviews(): Promise<Review[]> {
  try {
    const { getPopularReviewsFromFirestore } = await import(
      "@/lib/firebase/data"
    );
    const withLikes = await getPopularReviewsFromFirestore(30);
    return withLikes
      .filter((r) => !EXCLUDED_FROM_MAIN_SECTIONS.includes(r.category_id))
      .slice(0, 20);
  } catch {
    return [];
  }
}

async function getEventAndBlogReviews(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    const [eventReviews, blogReviews] = await Promise.all([
      getReviewsFromFirestore(12, "event"),
      getReviewsFromFirestore(12, "blog"),
    ]);
    const merged = [...eventReviews, ...blogReviews].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || ""),
    );
    return merged.slice(0, 12);
  } catch {
    return [];
  }
}

async function getLiveEvents(): Promise<LiveEvent[]> {
  try {
    const { getLiveEventsFromFirestore } = await import(
      "@/lib/firebase/data"
    );
    return await getLiveEventsFromFirestore();
  } catch {
    return [];
  }
}

function getFirebaseStorageUrl(storagePath: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  if (!bucket) return "";
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
}

function toNewReviewItem(r: Review): NewReviewItem {
  const categoryName =
    r.categories && "name_ja" in r.categories
      ? (r.categories as { name_ja: string }).name_ja
      : "";
  let image: string | null = null;
  if (r.review_images && r.review_images.length > 0) {
    const first = [...r.review_images].sort(
      (a, b) => a.sort_order - b.sort_order,
    )[0];
    const url = getFirebaseStorageUrl(first.storage_path);
    if (url) image = url;
  }
  return {
    id: r.id,
    title: r.title,
    gear_name: r.gear_name,
    rating: r.rating,
    excerpt: "レビューを読む →",
    image,
    category: categoryName,
    author: "",
  };
}

export default async function HomePage() {
  const [
    recentReviews,
    popularReviews,
    eventBlogReviews,
    liveEvents,
    externalNews,
    profilesList,
  ] = await Promise.all([
    getRecentReviews(),
    getPopularReviews(),
    getEventAndBlogReviews(),
    getLiveEvents(),
    getExternalNewsForTopPage(),
    getProfilesListForTopPage(20),
  ]);

  const newReviewItems: NewReviewItem[] = recentReviews.map(toNewReviewItem);
  const popularReviewItems: NewReviewItem[] =
    popularReviews.map(toNewReviewItem);
  const eventBlogItems: NewReviewItem[] =
    eventBlogReviews.map(toNewReviewItem);

  // ヒーロースライドショー用：新着・人気レビューの画像URLを抽出（追加フェッチなし）
  const heroImageUrls = (() => {
    const fromNew = newReviewItems
      .map((i) => i.image)
      .filter((url): url is string => !!url);
    const fromPopular = popularReviewItems
      .map((i) => i.image)
      .filter((url): url is string => !!url);
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const url of [...fromNew, ...fromPopular]) {
      if (!seen.has(url)) {
        seen.add(url);
        combined.push(url);
      }
    }
    return combined.slice(0, 12);
  })();

  return (
    <div>
      {/* 上段：全幅ヒーロー（縦横フルスクリーン・シネマティック） */}
      <section
        className="relative left-1/2 flex h-[calc(100vh-4rem)] min-h-[320px] w-screen max-w-none -translate-x-1/2 flex-col justify-center overflow-hidden"
        aria-label="メインキャッチ"
      >
        <HeroSlideshow imageUrls={heroImageUrls} />
        {/* ダークオーバーレイ（テキスト・検索・タイルの視認性） */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/60 to-[var(--surface-dark)]"
          aria-hidden
        />

        <div className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center sm:gap-5">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.45)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
              <span className="tracking-[0.16em] uppercase">
                ✨ Welcome to Gear-Loom
              </span>
            </p>
            <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-[2.3rem] md:text-[2.6rem] lg:text-[3rem]">
              あなたの愛機を語ろう。
            </h1>
            <p className="text-[0.9rem] font-medium leading-relaxed text-gray-200 drop-shadow-md sm:text-sm md:text-base">
              こだわりのセッティングを共有して、みんなの音作りを応援しよう。機材の歴史を
              <span className="font-semibold text-electric-blue">
                「カスタム手帳」
              </span>
              に刻み、あなただけのデジタル機材庫を完成させませんか？
            </p>
            <div className="mt-2 flex flex-col items-center gap-3 sm:gap-4">
              <Button
                asChild
                className="group relative overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-black shadow-[0_0_35px_rgba(56,189,248,0.7)] transition-transform duration-200 hover:scale-[1.03] sm:px-8 md:px-9 md:text-base"
              >
                <Link href="/reviews/new">
                  <span className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300" />
                  <span className="relative flex items-center gap-2">
                    レビューを投稿する
                    <span className="text-xs opacity-80 transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </Link>
              </Button>
              <p className="text-[11px] text-gray-400 md:text-xs">
                会員登録は無料。あとから編集・非公開にもできます。
              </p>
            </div>

            {/* 検索窓（ヒーロー上にオーバーレイ） */}
            <div className="mt-6 w-full max-w-2xl sm:mt-8">
              <form
                action="/reviews"
                method="get"
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                role="search"
              >
                <input
                  type="search"
                  name="q"
                  placeholder="レビューを検索（タイトル・機材名）"
                  aria-label="レビューを検索"
                  className="flex-1 min-w-0 rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:border-electric-blue/50 focus:outline-none focus:ring-2 focus:ring-electric-blue/25 backdrop-blur-sm md:text-base md:py-2.5 md:px-4"
                />
                <Button
                  type="submit"
                  variant="default"
                  className="shrink-0 min-h-[40px] rounded-xl px-4 md:min-h-[42px] md:px-5"
                >
                  検索
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* スクロールダウン・インジケーター */}
        <div
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/80"
          aria-hidden
        >
          <span className="text-[10px] font-medium tracking-widest uppercase">
            Scroll
          </span>
          <span className="animate-bounce text-lg leading-none" aria-hidden>
            ↓
          </span>
        </div>
      </section>

      {/* 下段：3カラム（スマホでは1カラム）のメインエリア */}
      <div className="mt-2 flex flex-col gap-4 sm:mt-4 md:mt-6 lg:flex-row lg:gap-6">
        {/* 左サイドバー（カテゴリ） */}
        <aside className="order-2 hidden shrink-0 pt-2 md:block lg:order-1">
          <TopPageCategoryNav />
        </aside>

        {/* メインコンテンツ */}
        <div className="order-1 flex-1 min-w-0 space-y-6 md:space-y-8 lg:order-2 lg:space-y-10">
          {/* スマホ：カテゴリ横スクロール */}
          <TopPageCategoryNavMobile />

          {/* スマホのみ：レビュー・比較リスト・カスタム手帳…のメインナビ */}
          <TopPageMainNavMobile />

          {/* 新着レビュー */}
          <section className="min-w-0 overflow-hidden">
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              新着レビュー
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              クリックでレビュー記事（全文）と各ECの検索リンクへ
            </p>
            <NewReviewsCarousel items={newReviewItems} />
          </section>

          {/* 人気機材 */}
          <section className="min-w-0 overflow-hidden">
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              人気機材
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              いいね数・★の多い順。クリックでレビューへ
            </p>
            {popularReviewItems.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-400">
                  まだレビューがありません。
                </CardContent>
              </Card>
            ) : (
              <NewReviewsCarousel items={popularReviewItems} />
            )}
          </section>

          {/* イベント・ブログ */}
          <section className="min-w-0 overflow-hidden">
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              イベント・ブログ
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              イベントやブログ記事の新着。クリックで記事へ
            </p>
            {eventBlogItems.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-400">
                  まだイベント・ブログ記事がありません。
                </CardContent>
              </Card>
            ) : (
              <NewReviewsCarousel items={eventBlogItems} />
            )}
          </section>

          {/* 楽器・機材ニュース */}
          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              楽器・機材ニュース
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              ギター・マガジンWEBの最新New Gear記事と、デジマート・マガジン／PR
              TIMES（楽器）の公式ページへのリンクをまとめています。
            </p>
            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
              <NewsColumn
                title="ギター・マガジンWEB（New Gear）"
                items={externalNews.guitarmag}
              />
              <div className="space-y-3">
                <NewsLinkCard
                  title="デジマート・マガジン"
                  item={externalNews.digimart[0]}
                  fallbackLabel="デジマート・マガジンの最新記事一覧を見る"
                />
                <NewsLinkCard
                  title="PR TIMES（楽器）"
                  item={externalNews.prtimes[0]}
                  fallbackLabel="PR TIMES「楽器」カテゴリの最新リリース一覧を見る"
                />
              </div>
            </div>
          </section>

          {/* みんなのライブ日程 */}
          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              みんなのライブ日程
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              日付をクリックするとその日のライブ予定が表示されます。マイページで自分の予定を追加・編集できます。
            </p>
            <Card className="card-hover">
              <CardContent className="py-6">
                <TopPageLiveCalendar events={liveEvents} />
              </CardContent>
            </Card>
          </section>

          {/* 近くのお店・ライブハウスを探す */}
          <section className="min-w-0">
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              近くのお店・ライブハウスを探す
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              ボタンで切り替えて、Googleマップで楽器屋さん・ライブハウスを検索できます。
            </p>
            <NearbySpotsMap />
          </section>
        </div>

        {/* 右サイドバー（マイプロフィール） */}
        <div className="order-3 w-full shrink-0 pt-4 lg:order-3 lg:w-auto lg:pt-2">
          <TopPageUserSidebarGate
            users={profilesList}
            liveEvents={liveEvents}
          />
        </div>
      </div>
    </div>
  );
}

function NewsColumn({
  title,
  items,
}: {
  title: string;
  items: ExternalNewsItem[];
}) {
  return (
    <Card className="h-full border-surface-border/80 bg-surface-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-electric-blue">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-electric-blue/40 bg-electric-blue/10 text-[0.7rem] text-electric-blue">
            GM
          </span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            現在取得できるニュースがありません。
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {items.map((n) => (
              <li key={n.id}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block leading-relaxed text-gray-200 underline decoration-electric-blue/60 underline-offset-2 transition-colors hover:text-electric-blue line-clamp-3"
                >
                  {n.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NewsLinkCard({
  title,
  item,
  fallbackLabel,
}: {
  title: string;
  item?: ExternalNewsItem;
  fallbackLabel: string;
}) {
  const url = item?.url;
  const label = item?.title ?? fallbackLabel;

  return (
    <Card className="border-surface-border/80 bg-surface-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-electric-blue">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-electric-blue/40 bg-electric-blue/10 text-[0.7rem] text-electric-blue">
            {title.startsWith("デジマート") ? "DM" : "PR"}
          </span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm leading-relaxed text-gray-200 underline decoration-electric-blue/60 underline-offset-2 transition-colors hover:text-electric-blue"
          >
            {label}
          </a>
        ) : (
          <p className="text-sm text-gray-500">{fallbackLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}