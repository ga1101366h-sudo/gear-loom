"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { shouldUnoptimizeImage } from "@/lib/image-optimization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCategoryPath } from "@/lib/utils";
import { CategoryIcon } from "@/components/category-icon";
import { LiveEventCalendar } from "@/components/live-event-calendar";
import { FollowButton } from "@/components/follow-button";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/types/database";
import type { LiveEvent } from "@/types/database";
import type { Review } from "@/types/database";
import type { UserGearItem } from "@/types/gear";
import type { PublicBoardItem } from "@/lib/board-public";
import type React from "react";
import { Instagram, Mail, Twitch, Youtube } from "lucide-react";

function buildUrl(raw: string | null, type: "x" | "instagram" | "youtube" | "twitch"): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const handle = value.replace(/^@/, "");
  switch (type) {
    case "x":
      return `https://x.com/${handle}`;
    case "instagram":
      return `https://www.instagram.com/${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    case "twitch":
      return `https://www.twitch.tv/${handle}`;
    default:
      return null;
  }
}

export type ReviewWithLikeCount = Review & { likeCount?: number };

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type Props = {
  profile: Profile;
  events: LiveEvent[];
  reviews: ReviewWithLikeCount[];
  followersCount?: number;
  followingCount?: number;
  /** Prisma UserGear で取得した所有機材（渡されていればこれを優先表示） */
  gears?: UserGearItem[] | null;
  /** 公開済みボード一覧（紐づく BoardPost が isPublic のもののみ） */
  boards?: PublicBoardItem[];
  /** 投稿したエフェクターボード記事一覧（BoardPost ベース） */
  boardPosts?: {
    id: string;
    title: string;
    boardName: string;
    updatedAt: string;
    thumbnailUrl: string | null;
    likeCount?: number;
  }[];
  /** エフェクターボード記事へのいいね合計 */
  totalBoardLikes?: number;
  /** 親から渡すリアルタイム表示用（embedプレビューでpostMessage更新時） */
  overrideFollowersCount?: number;
  overrideFollowingCount?: number;
  /** true のときリンクは同じ見た目でテキストのみ表示（オーバーレイ用） */
  disableLinks?: boolean;
};

export function PublicProfileView({
  profile,
  events,
  reviews,
  followersCount = 0,
  followingCount = 0,
  gears = null,
  boards = [],
  boardPosts = [],
  totalBoardLikes = 0,
  overrideFollowersCount,
  overrideFollowingCount,
  disableLinks = false,
}: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isOwnProfile = Boolean(user?.uid && user.uid === profile.id);

  const xUrl = buildUrl(profile.sns_twitter, "x");
  const instagramUrl = buildUrl(profile.sns_instagram, "instagram");
  const youtubeUrl = buildUrl(profile.sns_youtube, "youtube");
  const twitchUrl = buildUrl(profile.sns_twitch, "twitch");
  const displayName = profile.display_name || profile.user_id || "ユーザー";
  const totalReviewLikes = reviews.reduce((sum, r) => sum + ((r as ReviewWithLikeCount).likeCount ?? 0), 0);
  const totalBoardLikesSafe = totalBoardLikes ?? 0;
  const hasContactOrSns = Boolean(profile.contact_email || xUrl || instagramUrl || youtubeUrl || twitchUrl);
  const hasGear = Boolean(
    (gears && gears.length > 0) ||
      profile.owned_gear ||
      (profile.owned_gear_images && profile.owned_gear_images.length > 0),
  );
  const hasBoards = boards.length > 0;

  const loginUrl = `/login?next=${encodeURIComponent(pathname ?? "/")}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <h1 className="font-display text-2xl font-bold text-white">プロフィール</h1>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0">
            {profile.avatar_url ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-electric-blue/50 bg-surface-card">
                <Image
                  src={profile.avatar_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-electric-blue/50 bg-surface-card flex items-center justify-center text-2xl font-bold text-electric-blue">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-2 min-w-0 flex-1">
            <CardTitle className="text-xl text-white truncate">{displayName}</CardTitle>
            {profile.user_id && (
              <p className="text-sm text-gray-500 truncate">@{profile.user_id}</p>
            )}
            {profile.main_instrument && (
              <p className="text-sm text-gray-400">担当楽器: {profile.main_instrument}</p>
            )}
            {profile.band_name && (
              <p className="text-sm text-gray-400">
                所属バンド:{" "}
                {profile.band_url && !disableLinks ? (
                  <a
                    href={profile.band_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-blue hover:underline"
                  >
                    {profile.band_name}
                  </a>
                ) : (
                  <span className={profile.band_url && disableLinks ? "text-electric-blue" : undefined}>
                    {profile.band_name}
                  </span>
                )}
              </p>
            )}
            {/* 本人: プロフィール編集 / ゲスト: フォローする or ログイン誘導（操作ボタンのみ） */}
            {!disableLinks && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isOwnProfile ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/profile">プロフィールを編集</Link>
                  </Button>
                ) : (
                  <>
                    {user ? (
                      <FollowButton targetProfileUid={profile.id} className="shrink-0" />
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={loginUrl}>ログインしてフォローする</Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.bio && (
            <section className="space-y-2">
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1 block">自己紹介</p>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{profile.bio}</p>
            </section>
          )}
          {/* 本人のときのみフォロー数・フォロワー数（純粋テキスト、操作ボタンと完全分離） */}
          {isOwnProfile && !disableLinks && (
            <div className="flex gap-4 text-sm pt-1">
              <p className="m-0">
                <span className="font-bold text-white">{overrideFollowingCount ?? followingCount}</span>{" "}
                <span className="text-gray-400">フォロー中</span>
              </p>
              <p className="m-0">
                <span className="font-bold text-white">{overrideFollowersCount ?? followersCount}</span>{" "}
                <span className="text-gray-400">フォロワー</span>
              </p>
            </div>
          )}
          {hasContactOrSns && (
            <section className="space-y-4">
              {profile.contact_email && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2 block">連絡先</p>
                  {disableLinks ? (
                    <span className="text-sm text-gray-400 flex items-center gap-2 break-all">
                      <Mail className="h-4 w-4 text-gray-500" aria-hidden />
                      {profile.contact_email}
                    </span>
                  ) : (
                    <a
                      href={`mailto:${profile.contact_email}`}
                      className="text-sm text-gray-400 flex items-center gap-2 break-all hover:text-gray-200 transition-colors"
                    >
                      <Mail className="h-4 w-4 text-gray-500" aria-hidden />
                      {profile.contact_email}
                    </a>
                  )}
                </div>
              )}
              {(xUrl || instagramUrl || youtubeUrl || twitchUrl) && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2 block">SNS</p>
                  <div className="flex gap-3">
                    {xUrl &&
                      (disableLinks ? (
                        <span
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-gray-200 bg-white/5"
                          aria-label="X"
                          title="X"
                        >
                          <XIcon className="h-5 w-5" aria-hidden />
                        </span>
                      ) : (
                        <a
                          href={xUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="X"
                          title="X"
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-gray-200 bg-white/5 hover:bg-white/20"
                        >
                          <XIcon className="h-5 w-5" aria-hidden />
                        </a>
                      ))}
                    {youtubeUrl &&
                      (disableLinks ? (
                        <span
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-[#FF0000] bg-white/5"
                          aria-label="YouTube"
                          title="YouTube"
                        >
                          <Youtube className="h-5 w-5" aria-hidden />
                        </span>
                      ) : (
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="YouTube"
                          title="YouTube"
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-[#FF0000] bg-white/5 hover:bg-[#FF0000]/15"
                        >
                          <Youtube className="h-5 w-5" aria-hidden />
                        </a>
                      ))}
                    {twitchUrl &&
                      (disableLinks ? (
                        <span
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-[#9146FF] bg-white/5"
                          aria-label="Twitch"
                          title="Twitch"
                        >
                          <Twitch className="h-5 w-5" aria-hidden />
                        </span>
                      ) : (
                        <a
                          href={twitchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Twitch"
                          title="Twitch"
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-[#9146FF] bg-white/5 hover:bg-[#9146FF]/15"
                        >
                          <Twitch className="h-5 w-5" aria-hidden />
                        </a>
                      ))}
                    {instagramUrl &&
                      (disableLinks ? (
                        <span
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-[#E1306C] bg-white/5"
                          aria-label="Instagram"
                          title="Instagram"
                        >
                          <Instagram className="h-5 w-5" aria-hidden />
                        </span>
                      ) : (
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Instagram"
                          title="Instagram"
                          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-[#E1306C] bg-white/5 hover:bg-[#E1306C]/15"
                        >
                          <Instagram className="h-5 w-5" aria-hidden />
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </CardContent>
      </Card>

      <Tabs defaultValue="gear" className="w-full">
        <div className="overflow-x-auto scrollbar-hide min-w-0 -mx-1 px-1">
          <TabsList className="w-max min-w-full inline-flex flex-nowrap justify-start gap-0 shrink-0 border-b border-surface-border bg-transparent">
            <TabsTrigger value="gear" className="shrink-0">機材</TabsTrigger>
            <TabsTrigger value="posts" className="shrink-0">投稿</TabsTrigger>
            <TabsTrigger value="activity" className="shrink-0">
              {isOwnProfile ? "アクティビティ" : "スケジュール"}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="gear" className="mt-6 space-y-12">
          <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>}>
          {/* エフェクターボード一覧（ゲスト含め常に表示。0件のときは空メッセージ） */}
          <Card>
            <CardHeader>
              <CardTitle className="text-electric-blue">
                {isOwnProfile ? "マイエフェクターボード" : "エフェクターボード"}
              </CardTitle>
              <CardDescription>
                {isOwnProfile ? "公開しているエフェクターボード一覧" : "このユーザーの公開エフェクターボード一覧"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {boards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {boards.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-surface-border bg-white/[0.03] overflow-hidden"
                    >
                      <div className="relative aspect-video w-full bg-[#0a0a0a]">
                        {b.actualPhotoUrl || b.thumbnail ? (
                          <Image
                            src={b.actualPhotoUrl || b.thumbnail || ""}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            unoptimized={shouldUnoptimizeImage(String(b.actualPhotoUrl || b.thumbnail || ""))}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">サムネイルなし</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-white truncate">{b.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">公開しているエフェクターボードはありません。</p>
              )}
            </CardContent>
          </Card>
          {hasGear && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-electric-blue">所有機材</CardTitle>
                    <CardDescription>登録している機材・ボード構成</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gears && gears.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {gears.map((item) => (
                          <div
                            key={item.userGearId}
                            className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-start gap-1.5"
                          >
                            <span className="flex items-center gap-1.5 text-xs shrink-0">
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 border border-white/10 text-gray-400">
                                <CategoryIcon name={item.category} className="h-3.5 w-3.5" />
                              </span>
                              <span className="px-2 py-0.5 bg-white/10 rounded-full text-gray-200">{formatCategoryPath(item.category)}</span>
                            </span>
                            <span className="text-gray-200 whitespace-pre-wrap min-w-0 leading-tight text-sm md:text-base">
                              {[item.manufacturer, item.name].filter(Boolean).join(" / ") || item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {profile.owned_gear && (!gears || gears.length === 0) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {profile.owned_gear
                          .split(/\r?\n/)
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line, idx) => {
                            const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
                            const category = match ? match[1] : null;
                            const name = match ? match[2].trim() : line;
                            return (
                              <div
                                key={idx}
                                className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-start gap-1.5"
                              >
                                {category && (
                                  <span className="flex items-center gap-1.5 text-xs shrink-0">
                                    <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 border border-white/10 text-gray-400">
                                      <CategoryIcon name={category} className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-gray-200">{formatCategoryPath(category)}</span>
                                  </span>
                                )}
                                <span className="text-gray-200 whitespace-pre-wrap min-w-0 leading-tight text-sm md:text-base">{name}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    {profile.owned_gear_images && profile.owned_gear_images.length > 0 && (
                      <div className={gears?.length || profile.owned_gear ? "pt-2" : ""}>
                        <p className="text-sm text-gray-400 mb-2">登録画像</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {profile.owned_gear_images.map((url) => (
                            <div
                              key={url}
                              className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]"
                            >
                              <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" unoptimized />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
          {!hasGear && (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-gray-400">所有機材の登録はありません。</p>
              </CardContent>
            </Card>
          )}
          </Suspense>
        </TabsContent>

        <TabsContent value="posts" className="mt-6 space-y-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-electric-blue">投稿した記事</CardTitle>
              <CardDescription>このアカウントが投稿したレビュー・記事一覧</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 && boardPosts.length === 0 ? (
                <p className="text-sm text-gray-400">まだ投稿がありません。</p>
              ) : (
                <div className="space-y-6">
                  {reviews.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">レビュー・記事</h3>
                      <ul className="space-y-2">
                        {reviews.map((r) => {
                          const content = (
                            <>
                              <span className="block font-medium line-clamp-2">{r.title}</span>
                              {r.gear_name && (
                                <span className="ml-2 text-gray-400"> — {r.gear_name}</span>
                              )}
                              <span className="ml-2 text-xs text-gray-500">
                                {r.created_at
                                  ? new Date(r.created_at).toLocaleDateString("ja-JP")
                                  : ""}
                              </span>
                              {typeof (r as ReviewWithLikeCount).likeCount === "number" && (
                                <span className="ml-2 text-xs text-gray-400" aria-label="いいね数">
                                  ❤ {(r as ReviewWithLikeCount).likeCount}
                                </span>
                              )}
                            </>
                          );
                          return (
                            <li key={r.id}>
                              {disableLinks ? (
                                <div className="block rounded-lg border border-surface-border bg-surface-card/40 px-3 py-2 text-sm text-gray-200">
                                  {content}
                                </div>
                              ) : (
                                <Link
                                  href={`/reviews/${r.id}`}
                                  className="block rounded-lg border border-surface-border bg-surface-card/40 px-3 py-2 text-sm text-gray-200 hover:border-electric-blue/50 hover:text-electric-blue transition-colors"
                                >
                                  {content}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {boardPosts.length > 0 && (
                    <div className={reviews.length > 0 ? "pt-4 border-t border-surface-border" : ""}>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">投稿したエフェクターボード</h3>
                      <ul className="space-y-2">
                        {boardPosts.map((b) => {
                          const content = (
                            <>
                              <span className="block font-medium line-clamp-2">{b.title}</span>
                              {b.boardName && (
                                <span className="ml-2 text-gray-400"> — {b.boardName}</span>
                              )}
                              <span className="ml-2 text-xs text-gray-500">
                                {b.updatedAt
                                  ? new Date(b.updatedAt).toLocaleDateString("ja-JP")
                                  : ""}
                              </span>
                              {typeof b.likeCount === "number" && (
                                <span className="ml-2 text-xs text-gray-400" aria-label="いいね数">
                                  ❤ {b.likeCount}
                                </span>
                              )}
                            </>
                          );
                          return (
                            <li key={b.id}>
                              {disableLinks ? (
                                <div className="block rounded-lg border border-surface-border bg-surface-card/40 px-3 py-2 text-sm text-gray-200">
                                  {content}
                                </div>
                              ) : (
                                <Link
                                  href={`/boards/post/${b.id}`}
                                  className="block rounded-lg border border-surface-border bg-surface-card/40 px-3 py-2 text-sm text-gray-200 hover:border-electric-blue/50 hover:text-electric-blue transition-colors"
                                >
                                  {content}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-t border-b border-electric-blue/30">
            <CardContent className="pt-6 pb-6">
              <h3 className="text-base font-semibold text-electric-blue mb-1">投稿にもらったイイね</h3>
              <p className="text-sm text-gray-400 mb-2">このアカウントの投稿（レビュー・ボード）へのいいね合計</p>
              <p className="text-2xl font-bold text-white">
                {totalReviewLikes + totalBoardLikesSafe}
                <span className="text-lg font-normal text-gray-400 ml-1">件</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6 space-y-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-electric-blue">
                {isOwnProfile ? "マイスケジュール（カレンダー）" : "カレンダー"}
              </CardTitle>
              <CardDescription>このアカウントのライブ・イベント予定</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-gray-400">ライブの予定はありません。</p>
              ) : (
                <LiveEventCalendar initialEvents={events} readOnly disableLinks={disableLinks} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
