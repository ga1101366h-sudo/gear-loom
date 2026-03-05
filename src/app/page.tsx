import React from "react";
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
import { TopPageUserSidebarGate } from "@/components/top-page-user-sidebar";
import { TopPageFollowingReviews } from "@/components/top-page-following-reviews";
import { NearbySpotsMap } from "@/components/nearby-spots-map";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { HeroSearchInput } from "@/components/hero-search-input";
import {
  getExternalNewsForTopPage,
  type ExternalNewsItem,
} from "@/lib/news";
import {
  getProfilesListForTopPage,
  getSiteAnnouncementsFromFirestore,
} from "@/lib/firebase/data";
import { SiteAnnouncements } from "@/components/site-announcements";
import type { Review, LiveEvent } from "@/types/database";

/** トップページ：60秒間はキャッシュして Firestore リード数を削減（ISR） */
export const revalidate = 60;

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
  const profile = r.profiles;
  const authorName =
    profile?.display_name?.trim() ||
    (profile?.user_id?.trim() ? `@${profile.user_id.trim()}` : "ユーザー");
  const authorAvatar = profile?.avatar_url?.trim() || null;
  return {
    id: r.id,
    title: r.title,
    gear_name: r.gear_name,
    maker_name: r.maker_name ?? null,
    rating: r.rating,
    excerpt: "レビューを読む →",
    image,
    category: categoryName,
    author: authorName,
    author_avatar: authorAvatar || null,
  };
}

const getCachedRecentReviews = React.cache(getRecentReviews);
const getCachedPopularReviews = React.cache(getPopularReviews);
const getCachedEventAndBlogReviews = React.cache(getEventAndBlogReviews);
const getCachedLiveEvents = React.cache(getLiveEvents);
const getCachedExternalNews = React.cache(getExternalNewsForTopPage);
const getCachedProfilesList = React.cache(() => getProfilesListForTopPage(20));
const getCachedSiteAnnouncements = React.cache(() => getSiteAnnouncementsFromFirestore(10));

export default async function HomePage() {
  const [
    recentReviews,
    popularReviews,
    eventBlogReviews,
    liveEvents,
    externalNews,
    profilesList,
    siteAnnouncements,
  ] = await Promise.all([
    getCachedRecentReviews(),
    getCachedPopularReviews(),
    getCachedEventAndBlogReviews(),
    getCachedLiveEvents(),
    getCachedExternalNews(),
    getCachedProfilesList(),
    getCachedSiteAnnouncements(),
  ]);

  const newReviewItems: NewReviewItem[] = recentReviews.map(toNewReviewItem);
  const popularReviewItems: NewReviewItem[] =
    popularReviews.map(toNewReviewItem);
  const eventBlogItems: NewReviewItem[] =
    eventBlogReviews.map(toNewReviewItem);

  // ヒーロースライドショー用：新着記事の画像を順に5件まで表示
  const heroImageUrls = newReviewItems
    .map((i) => i.image)
    .filter((url): url is string => !!url)
    .slice(0, 5);

  return (
    <div>
      {/* 上段：全幅ヒーロー（縦横フルスクリーン・シネマティック） */}
      <section
        className="relative left-1/2 flex h-[calc(100vh-4rem)] min-h-[320px] w-screen max-w-[100vw] -translate-x-1/2 flex-col justify-center overflow-hidden box-border"
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
              <Link
                href="/notebook"
                className="font-semibold text-electric-blue underline decoration-electric-blue/60 underline-offset-2 transition-colors hover:text-cyan-300 hover:decoration-cyan-300/80"
              >
                カスタム手帳
              </Link>
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

            {/* 検索窓（プレースホルダーはタイピング風に切り替え） */}
            <div className="mt-6 w-full max-w-2xl sm:mt-8">
              <HeroSearchInput />
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

        {/* メインコンテンツ（スマホでは order-2 でマイプロフィールの下に表示） */}
        <div className="order-2 flex-1 min-w-0 space-y-6 md:space-y-8 lg:order-2 lg:space-y-10">
          {/* スマホ：カテゴリ横スクロール */}
          <TopPageCategoryNavMobile />

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

          {/* フォロー中のユーザの記事（ログイン時のみ表示） */}
          <TopPageFollowingReviews />

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

        {/* 右サイドバー（スマホでは order-1 で新着レビューの上に表示・PCでは右側） */}
        <div className="order-1 flex w-full shrink-0 flex-col gap-4 pt-4 lg:order-3 lg:w-[280px] lg:pt-2">
          <TopPageUserSidebarGate
            users={profilesList}
            liveEvents={liveEvents}
          />
          <div className="hidden lg:block">
            <SiteAnnouncements announcements={siteAnnouncements} />
          </div>
        </div>

        {/* スマホのみ：おしらせは従来通り下部に表示 */}
        <div className="order-3 w-full lg:hidden">
          <SiteAnnouncements announcements={siteAnnouncements} />
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