import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroCta } from "@/components/hero-cta";
import { NewReviewsCarousel, type NewReviewItem } from "@/components/new-reviews-carousel";
import { TopPageLiveCalendar } from "@/components/top-page-live-calendar";
import { TopPageCategoryNav, TopPageCategoryNavMobile } from "@/components/top-page-category-nav";
import { TopPageUserSidebarGate } from "@/components/top-page-user-sidebar";
import { NearbySpotsMap } from "@/components/nearby-spots-map";
import { getExternalNewsForTopPage, type ExternalNewsItem } from "@/lib/news";
import { getProfilesListForTopPage } from "@/lib/firebase/data";
import type { Review, LiveEvent } from "@/types/database";

/** トップページは常に最新のレビュー・人気機材を表示するため、キャッシュせず毎回サーバーで描画する */
export const dynamic = "force-dynamic";

async function getRecentReviews(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    return await getReviewsFromFirestore(12);
  } catch {
    return [];
  }
}

async function getPopularReviews(): Promise<Review[]> {
  try {
    const { getPopularReviewsFromFirestore } = await import("@/lib/firebase/data");
    const withLikes = await getPopularReviewsFromFirestore(20);
    return withLikes;
  } catch {
    return [];
  }
}

async function getLiveEvents(): Promise<LiveEvent[]> {
  try {
    const { getLiveEventsFromFirestore } = await import("@/lib/firebase/data");
    return await getLiveEventsFromFirestore();
  } catch {
    return [];
  }
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
    const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
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
  const [recentReviews, popularReviews, liveEvents, externalNews, profilesList] =
    await Promise.all([
      getRecentReviews(),
      getPopularReviews(),
      getLiveEvents(),
      getExternalNewsForTopPage(),
      getProfilesListForTopPage(20),
    ]);

  const newReviewItems: NewReviewItem[] = recentReviews.map(toNewReviewItem);
  const popularReviewItems: NewReviewItem[] = popularReviews.map(toNewReviewItem);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:gap-8">
      <aside className="hidden md:block shrink-0 pt-2 order-2 lg:order-1">
        <TopPageCategoryNav />
      </aside>
      <div className="flex-1 min-w-0 space-y-8 md:space-y-12 lg:space-y-16 order-3 lg:order-2">
        {/* スマホ：カテゴリ横スクロール */}
        <TopPageCategoryNavMobile />
        {/* ヒーロー：CTAs */}
        <section className="text-center py-6 md:py-10 lg:py-14 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 drop-shadow-glow">
            Gear-Loom
          </h1>
          <p
            className="text-gray-400 mb-10 leading-relaxed mx-auto w-full max-w-3xl px-2 sm:px-4 sm:whitespace-nowrap"
            style={{ fontSize: "clamp(0.75rem, 2.5vw + 0.5rem, 1.125rem)" }}
          >
            楽器・機材のレビューを共有し、みんなの音作りを応援する UGC プラットフォーム
          </p>
          <form
            action="/reviews"
            method="get"
            className="mx-auto mb-8 flex max-w-xl gap-2 px-2 sm:px-4"
            role="search"
          >
            <input
              type="search"
              name="q"
              placeholder="レビューを検索（タイトル・機材名）"
              className="flex-1 min-w-0 rounded-lg border border-surface-border bg-surface-card/80 px-4 py-3 sm:py-2.5 text-base text-gray-100 placeholder:text-gray-500 focus:border-electric-blue/50 focus:outline-none focus:ring-2 focus:ring-electric-blue/20 touch-manipulation"
              aria-label="レビューを検索"
            />
            <Button type="submit" variant="default" className="shrink-0 min-h-[44px] touch-manipulation">
              検索
            </Button>
          </form>
          <HeroCta />
        </section>

        {/* 新着レビュー（カルーセル・横にゆっくりスライド） */}
        <section className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:150ms] overflow-hidden min-w-0">
          <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-white mb-2">
            新着レビュー
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            クリックでレビュー記事（全文）と各ECの検索リンクへ
          </p>
          <NewReviewsCarousel items={newReviewItems} />
        </section>

        {/* 人気機材（★数・いいね数でソート、カルーセル） */}
        <section className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:250ms] overflow-hidden min-w-0">
          <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-white mb-2">
            人気機材
          </h2>
          <p className="text-gray-400 text-sm mb-6">
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

        {/* 楽器・機材ニュース */}
        <section className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:400ms]">
          <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-white mb-2">
            楽器・機材ニュース
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            ギター・マガジンWEBの最新New Gear記事と、デジマート・マガジン／PR TIMES（楽器）の公式ページへのリンクをまとめています。
          </p>
          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <NewsColumn title="ギター・マガジンWEB（New Gear）" items={externalNews.guitarmag} />
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

        {/* みんなのライブ日程カレンダー */}
        <section className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:500ms]">
          <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-white mb-2">
            みんなのライブ日程
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            日付をクリックするとその日のライブ予定が表示されます。マイページで自分の予定を追加・編集できます。
          </p>
          <Card className="card-hover">
            <CardContent className="py-6">
              <TopPageLiveCalendar events={liveEvents} />
            </CardContent>
          </Card>
        </section>

        {/* 近くのお店・ライブハウスを探す */}
        <section className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:600ms] min-w-0">
          <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-white mb-2">
            近くのお店・ライブハウスを探す
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            ボタンで切り替えて、Googleマップで楽器屋さん・ライブハウスを検索できます。
          </p>
          <NearbySpotsMap />
        </section>
      </div>
      <div className="w-full lg:w-auto shrink-0 order-1 lg:order-3 pt-0 lg:pt-2">
        <TopPageUserSidebarGate users={profilesList} liveEvents={liveEvents} />
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
    <Card className="h-full bg-surface-card/80 border-surface-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-electric-blue">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-electric-blue/10 text-[0.7rem] text-electric-blue border border-electric-blue/40">
            GM
          </span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">現在取得できるニュースがありません。</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {items.map((n) => (
              <li key={n.id}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-200 underline underline-offset-2 decoration-electric-blue/60 hover:text-electric-blue transition-colors leading-relaxed line-clamp-3"
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
    <Card className="bg-surface-card/80 border-surface-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-electric-blue">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-electric-blue/10 text-[0.7rem] text-electric-blue border border-electric-blue/40">
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
            className="block text-sm text-gray-200 underline underline-offset-2 decoration-electric-blue/60 hover:text-electric-blue transition-colors leading-relaxed"
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

