import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
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
import {
  TopPageCategoryNav,
  TopPageCategoryNavMobile,
} from "@/components/top-page-category-nav";
import { TopPageUserSidebarGate } from "@/components/top-page-user-sidebar";
import { TopPageFollowingReviews } from "@/components/top-page-following-reviews";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { HeroSearchInput } from "@/components/hero-search-input";
import {
  getExternalNewsForTopPage,
  type ExternalNewsItem,
} from "@/lib/news";
import {
  getProfilesListForTopPage,
  getSiteAnnouncementsFromFirestore,
  getProfilesByUids,
} from "@/lib/firebase/data";
import { prisma } from "@/lib/prisma";
import { SiteAnnouncements } from "@/components/site-announcements";
import { BoardCarousel } from "@/components/board-carousel";
import { getCategoryPathDisplay } from "@/data/post-categories";
import type { Review, LiveEvent } from "@/types/database";

/** トップページ：右サイドバーのマイプロフィール・所持機材等を常に最新にするためキャッシュ無効化 */
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gear-loom.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/mock/ogp-final.png`;

export const metadata: Metadata = {
  title: "Gear-Loom | あなたの愛機を語ろう",
  description:
    "機材への愛とこだわりをレビューやカスタム手帳に記録し、音楽仲間と共有できるプラットフォーム。",
  openGraph: {
    title: "Gear-Loom | あなたの愛機を語ろう",
    description:
      "機材への愛とこだわりをレビューやカスタム手帳に記録し、音楽仲間と共有できるプラットフォーム。",
    url: SITE_URL,
    siteName: "Gear-Loom",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gear-Loom | あなたの愛機を語ろう",
    description:
      "機材への愛とこだわりをレビューやカスタム手帳に記録し、音楽仲間と共有できるプラットフォーム。",
    images: [DEFAULT_OG_IMAGE],
  },
};

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

/** 新着エフェクターボード（公開投稿のみ・最新6件） */
async function getLatestBoardPosts() {
  try {
    return await prisma.boardPost.findMany({
      where: { isPublic: true },
      include: {
        board: { include: { user: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
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
  const slug =
    r.categories && "slug" in r.categories
      ? (r.categories as { slug: string }).slug
      : r.category_id ?? "";
  const categoryName = slug ? getCategoryPathDisplay(slug) : "";
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
    category_slug: slug || null,
    author: authorName,
    author_avatar: authorAvatar || null,
    author_uid: r.author_id ?? null,
  };
}

const getCachedRecentReviews = React.cache(getRecentReviews);
const getCachedPopularReviews = React.cache(getPopularReviews);
const getCachedLiveEvents = React.cache(getLiveEvents);
const getCachedLatestBoardPosts = React.cache(getLatestBoardPosts);
const getCachedExternalNews = React.cache(getExternalNewsForTopPage);
const getCachedProfilesList = React.cache(() => getProfilesListForTopPage(20));
const getCachedSiteAnnouncements = React.cache(() => getSiteAnnouncementsFromFirestore(10));

export default async function HomePage() {
  const [
    recentReviews,
    popularReviews,
    liveEvents,
    latestBoardPosts,
    externalNews,
    profilesList,
    siteAnnouncements,
  ] = await Promise.all([
    getCachedRecentReviews(),
    getCachedPopularReviews(),
    getCachedLiveEvents(),
    getCachedLatestBoardPosts(),
    getCachedExternalNews(),
    getCachedProfilesList(),
    getCachedSiteAnnouncements(),
  ]);

  const boardAuthorUids = [
    ...new Set(
      latestBoardPosts.map((p) => p.board?.userId).filter(Boolean),
    ),
  ] as string[];
  let boardProfileMap: Awaited<ReturnType<typeof getProfilesByUids>>;
  try {
    boardProfileMap = await getProfilesByUids(boardAuthorUids);
  } catch {
    boardProfileMap = new Map();
  }

  const newReviewItems: NewReviewItem[] = recentReviews.map(toNewReviewItem);
  const popularReviewItems: NewReviewItem[] =
    popularReviews.map(toNewReviewItem);

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
            <p className="text-sm sm:text-base text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              買ったばかりのペダルから、夢のエフェクターボードまで、誰でも気軽に愛機をシェア！
              <br className="hidden sm:block" />
              初心者からプロまで、みんなで音作りを楽しめる
              <Link
                href="/about"
                className="font-semibold text-electric-blue underline decoration-electric-blue/60 underline-offset-4 mx-1 transition-colors hover:text-cyan-300 hover:decoration-cyan-300/80"
              >
                次世代のデジタル機材プラットフォーム
              </Link>
              です。
            </p>
            <div className="mt-2 flex flex-col items-center gap-3 sm:gap-4">
              <Button
                asChild
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/80 bg-transparent px-7 py-3.5 text-sm font-medium text-cyan-300 shadow-none hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors sm:px-8 md:px-9 md:text-base"
              >
                <Link href="/reviews/new">
                  <span>レビューを投稿する</span>
                  <span className="text-xs opacity-80">→</span>
                </Link>
              </Button>
              <p className="text-[11px] text-gray-400 md:text-xs text-center">
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

          {/* 新着エフェクターボード（キラーフィーチャー・コンテンツ最上部） */}
          <section className="min-w-0 overflow-hidden">
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              新着エフェクターボード
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              みんなの公開ボードを最新順で表示。クリックで詳細へ
            </p>
            {latestBoardPosts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-400">
                  まだ公開されたボードはありません。
                </CardContent>
              </Card>
            ) : (
              <BoardCarousel
                cards={latestBoardPosts.map((post) => {
                  const board = post.board;
                  const uid = board?.userId;
                  const profile = uid ? boardProfileMap.get(uid) : undefined;
                  const authorLabel =
                    profile?.display_name?.trim() ||
                    profile?.user_id?.trim() ||
                    (board?.user
                      ? (board.user.displayName?.trim() ||
                          board.user.email?.trim() ||
                          "名無しユーザー")
                      : "名無しユーザー");
                  const authorAvatarUrl = profile?.avatar_url?.trim() || null;
                  const title =
                    post.title?.trim() || board?.name?.trim() || "無題";
                  return {
                    postId: post.id,
                    title,
                    updatedAt: post.updatedAt.toISOString(),
                    authorLabel,
                    authorAvatarUrl,
                    actualPhotoUrl: board?.actualPhotoUrl?.trim() ?? null,
                    thumbnail: board?.thumbnail?.trim() ?? null,
                    ownerUid: uid ?? null,
                  };
                })}
              />
            )}
          </section>

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
                  className="block rounded-md px-2 py-2 leading-relaxed text-gray-200 underline decoration-electric-blue/60 underline-offset-2 transition-colors hover:text-electric-blue hover:bg-white/[0.02] line-clamp-3"
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
            className="block rounded-md px-2 py-2 text-sm leading-relaxed text-gray-200 underline decoration-electric-blue/60 underline-offset-2 transition-colors hover:text-electric-blue hover:bg-white/[0.02]"
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