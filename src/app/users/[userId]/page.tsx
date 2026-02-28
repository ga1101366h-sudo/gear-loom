import Image from "next/image";
import { ReviewImagesGallery } from "@/components/review-images-gallery";
import { notFound } from "next/navigation";
import { getProfileByUserIdFromFirestore, getLiveEventsByUserIdFromFirestore } from "@/lib/firebase/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LiveEventCalendar } from "@/components/live-event-calendar";

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

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getProfileByUserIdFromFirestore(decodeURIComponent(userId));
  if (!profile) notFound();
  const events = await getLiveEventsByUserIdFromFirestore(profile.id);

  const xUrl = buildUrl(profile.sns_twitter, "x");
  const instagramUrl = buildUrl(profile.sns_instagram, "instagram");
  const youtubeUrl = buildUrl(profile.sns_youtube, "youtube");
  const twitchUrl = buildUrl(profile.sns_twitch, "twitch");
  const displayName = profile.display_name || profile.user_id || "ユーザー";

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
                {profile.band_url ? (
                  <a
                    href={profile.band_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-blue hover:underline"
                  >
                    {profile.band_name}
                  </a>
                ) : (
                  profile.band_name
                )}
              </p>
            )}
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
              <CardDescription className="text-gray-300 mb-1">ボード・所有機材</CardDescription>
              {profile.owned_gear && (
                <ul className="space-y-1 text-sm text-gray-200 mb-2">
                  {profile.owned_gear
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-[3px] text-electric-blue">•</span>
                        <span className="whitespace-pre-wrap">{line}</span>
                      </li>
                    ))}
                </ul>
              )}
              {profile.owned_gear_images && profile.owned_gear_images.length > 0 && (
                <div className="mt-2">
                  <ReviewImagesGallery
                    images={profile.owned_gear_images.map((url) => ({
                      url,
                    }))}
                  />
                </div>
              )}
            </section>
          )}
          {profile.contact_email && (
            <section>
              <CardDescription className="text-gray-300 mb-1">連絡先メールアドレス</CardDescription>
              <a
                href={`mailto:${profile.contact_email}`}
                className="text-sm text-electric-blue hover:underline break-all"
              >
                {profile.contact_email}
              </a>
            </section>
          )}
          {(xUrl || instagramUrl || youtubeUrl || twitchUrl) && (
            <section className="space-y-2">
              <CardDescription className="text-gray-300">リンク</CardDescription>
              <div className="flex flex-wrap gap-2">
                {xUrl && (
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    X
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    YouTube
                  </a>
                )}
                {twitchUrl && (
                  <a
                    href={twitchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-gray-200 hover:border-electric-blue/60 hover:text-electric-blue transition-colors"
                  >
                    Twitch
                  </a>
                )}
              </div>
            </section>
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
            <LiveEventCalendar initialEvents={events} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

