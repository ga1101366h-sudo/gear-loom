import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroCta } from "@/components/hero-cta";
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

  return (
    <div>
      {/* 上段：全幅ヒーローセクション */}
      <section className="relative mx-[-0.75rem] sm:mx-[-1rem] py-8 sm:py-10 md:py-12 lg:py-14">
        {/* 背景グラデーション＆光彩・ドットパターン */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          {/* ベースの縦グラデーション（最背面） */}
          <div className="absolute inset-0 bg-gradient-to-b from-surface-dark via-surface-card/60 to-surface-dark/95" />

          {/* 既存の左右グロー */}
          <div className="absolute -top-24 -left-10 h-56 w-56 rounded-full bg-electric-blue/30 blur-3xl opacity-40" />
          <div className="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl opacity-40" />

          {/* メインコピー背面の大きなシアンの光彩 */}
          <div className="absolute inset-x-[10%] top-1/3 h-64 rounded-full bg-cyan-500/18 blur-[120px] opacity-60" />

          {/* ごく薄いドットパターン（グリッド状） */}
          <div className="absolute inset-0 opacity-[0.16] mix-blend-soft-light bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.5)_1px,transparent_0)] bg-[size:22px_22px]" />
        </div>

        <div className="relative px-4 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center sm:gap-5">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.45)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
              <span className="tracking-[0.16em] uppercase">
                ✨ Welcome to Gear-Loom
              </span>
            </p>
            <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-white sm:text-[2.3rem] md:text-[2.6rem] lg:text-[3rem]">
              あなたの愛機を語ろう。
            </h1>
            <p className="text-[0.9rem] leading-relaxed text-gray-300 sm:text-sm md:text-base">
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
          </div>
        </div>
      </section>

      {/* 下段：3カラム（スマホでは1カラム）のメインエリア */}
      <div className="mt-4 flex flex-col gap-4 sm:mt-6 md:mt-8 lg:flex-row lg:gap-6">
        {/* 左サイドバー（カテゴリ） */}
        <aside className="order-2 hidden shrink-0 pt-2 md:block lg:order-1">
          <TopPageCategoryNav />
        </aside>

        {/* メインコンテンツ */}
        <div className="order-1 flex-1 min-w-0 space-y-8 md:space-y-12 lg:order-2 lg:space-y-16">
          {/* スマホ：カテゴリ横スクロール */}
          <TopPageCategoryNavMobile />

          {/* 検索＋アカウントCTA */}
          <section>
            <div className="rounded-2xl border border-surface-border/80 bg-surface-card/80 px-4 py-4 backdrop-blur-xl sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              <p className="mb-2 text-xs font-medium text-gray-400">
                気になる機材のレビューを探す
              </p>
              <form
                action="/reviews"
                method="get"
                className="flex flex-col gap-2 sm:flex-row"
                role="search"
              >
                <input
                  type="search"
                  name="q"
                  placeholder="レビューを検索（タイトル・機材名）"
                  aria-label="レビューを検索"
                  className="flex-1 min-w-0 rounded-lg border border-surface-border bg-surface-dark/80 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-electric-blue/50 focus:outline-none focus:ring-2 focus:ring-electric-blue/25 md:text-base"
                />
                <Button
                  type="submit"
                  variant="default"
                  className="shrink-0 min-h-[40px] px-4 md:min-h-[44px] md:px-5"
                >
                  検索
                </Button>
              </form>
              <p className="mt-2 text-[11px] text-gray-500 md:text-xs">
                例：ストラトキャスター、JCM800、空間系、ベースアンプ…
              </p>
              <div className="mt-4 border-t border-surface-border/60 pt-3">
                <HeroCta />
              </div>
            </div>
          </section>

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