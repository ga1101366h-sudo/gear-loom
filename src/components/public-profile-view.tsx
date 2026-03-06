import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCategoryIconNameByDisplayLabel } from "@/data/post-categories";
import { getCategoryGroupIcon } from "@/lib/category-group-icons";
import { LiveEventCalendar } from "@/components/live-event-calendar";
import { ProfileFollowSection } from "@/components/profile-follow-section";
import type { Profile } from "@/types/database";
import type { LiveEvent } from "@/types/database";
import type { Review } from "@/types/database";

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

type Props = {
  profile: Profile;
  events: LiveEvent[];
  reviews: ReviewWithLikeCount[];
  followersCount?: number;
  followingCount?: number;
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
  overrideFollowersCount,
  overrideFollowingCount,
  disableLinks = false,
}: Props) {
  const xUrl = buildUrl(profile.sns_twitter, "x");
  const instagramUrl = buildUrl(profile.sns_instagram, "instagram");
  const youtubeUrl = buildUrl(profile.sns_youtube, "youtube");
  const twitchUrl = buildUrl(profile.sns_twitch, "twitch");
  const displayName = profile.display_name || profile.user_id || "ユーザー";
  const totalReviewLikes = reviews.reduce((sum, r) => sum + ((r as ReviewWithLikeCount).likeCount ?? 0), 0);

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
          <div className="space-y-1 min-w-0">
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
            <ProfileFollowSection
              profileUid={profile.id}
              initialFollowersCount={followersCount}
              initialFollowingCount={followingCount}
              overrideFollowersCount={overrideFollowersCount}
              overrideFollowingCount={overrideFollowingCount}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.bio && (
            <section>
              <CardDescription className="text-gray-300 mb-1">自己紹介</CardDescription>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{profile.bio}</p>
            </section>
          )}
          {(profile.owned_gear || (profile.owned_gear_images && profile.owned_gear_images.length > 0)) && (
            <section>
              <CardDescription className="text-gray-300 mb-3">ボード・所有機材</CardDescription>
              {profile.owned_gear && (
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  {profile.owned_gear
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, idx) => {
                      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
                      const category = match ? match[1] : null;
                      const name = match ? match[2].trim() : line;
                      const iconName = category ? getCategoryIconNameByDisplayLabel(category) : null;
                      const CategoryIcon = iconName ? getCategoryGroupIcon(iconName) : null;
                      return (
                        <div
                          key={idx}
                          className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-start gap-1.5"
                        >
                          {category && (
                            <span className="flex items-center gap-1.5 text-xs shrink-0">
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 border border-white/10 text-gray-400">
                                {CategoryIcon ? <CategoryIcon className="h-3.5 w-3.5" aria-hidden /> : null}
                              </span>
                              <span className="px-2 py-0.5 bg-white/10 rounded-full text-gray-200">{category}</span>
                            </span>
                          )}
                          <span className="text-gray-200 whitespace-pre-wrap min-w-0 leading-tight text-sm md:text-base">{name}</span>
                        </div>
                      );
                    })}
                </div>
              )}
              {profile.owned_gear_images && profile.owned_gear_images.length > 0 && (
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
              )}
            </section>
          )}
          {profile.contact_email && (
            <section>
              <CardDescription className="text-gray-300 mb-1">連絡先メールアドレス</CardDescription>
              {disableLinks ? (
                <span className="text-sm text-electric-blue break-all">{profile.contact_email}</span>
              ) : (
                <a
                  href={`mailto:${profile.contact_email}`}
                  className="text-sm text-electric-blue hover:underline break-all"
                >
                  {profile.contact_email}
                </a>
              )}
            </section>
          )}
          {(xUrl || instagramUrl || youtubeUrl || twitchUrl) && (
            <section className="space-y-2">
              <CardDescription className="text-gray-300">リンク</CardDescription>
              <div className="flex flex-wrap gap-2">
                {xUrl && (disableLinks ? (
                  <span className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200">
                    X
                  </span>
                ) : (
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    X
                  </a>
                ))}
                {instagramUrl && (disableLinks ? (
                  <span className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200">
                    Instagram
                  </span>
                ) : (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    Instagram
                  </a>
                ))}
                {youtubeUrl && (disableLinks ? (
                  <span className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200">
                    YouTube
                  </span>
                ) : (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    YouTube
                  </a>
                ))}
                {twitchUrl && (disableLinks ? (
                  <span className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200">
                    Twitch
                  </span>
                ) : (
                  <a
                    href={twitchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    Twitch
                  </a>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>

      <Card className="border-t border-b border-electric-blue/30">
        <CardContent className="pt-6 pb-6">
          <h3 className="text-base font-semibold text-electric-blue mb-1">レビューにもらったイイね</h3>
          <p className="text-sm text-gray-400 mb-2">このアカウントの投稿へのいいね合計</p>
          <p className="text-2xl font-bold text-white">
            {totalReviewLikes}
            <span className="text-lg font-normal text-gray-400 ml-1">件</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">投稿した記事</CardTitle>
          <CardDescription>このアカウントが投稿したレビュー・記事一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400">まだ投稿がありません。</p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">ライブ日程</CardTitle>
          <CardDescription>このアカウントのライブ予定</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">ライブの予定はありません。</p>
          ) : (
            <LiveEventCalendar initialEvents={events} readOnly disableLinks={disableLinks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
