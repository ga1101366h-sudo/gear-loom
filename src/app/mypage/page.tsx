"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { isContentOnlyCategorySlug } from "@/data/post-categories";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveEventCalendar } from "@/components/live-event-calendar";
import { ProfilePreviewOverlay } from "@/components/profile-preview-overlay";
import type { Profile } from "@/types/database";
import type { Review } from "@/types/database";
import type { LiveEvent } from "@/types/database";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-electric-blue text-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "opacity-100" : "opacity-30"}>★</span>
      ))}
    </span>
  );
}

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
}

export default function MypagePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [likedReviews, setLikedReviews] = useState<Review[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/mypage");
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      const uid = user.uid;
      const [profileSnap, reviewsSnap, likesSnap, eventsSnap] = await Promise.all([
        getDoc(doc(db, "profiles", uid)),
        getDocs(
          query(collection(db, "reviews"), where("author_id", "==", uid))
        ),
        getDocs(
          query(collection(db, "review_likes"), where("user_id", "==", uid))
        ),
        getDocs(
          query(collection(db, "live_events"), where("user_id", "==", uid))
        ),
      ]);

      const profileData = profileSnap.data();
      if (profileData) {
        setProfile({
          id: uid,
          display_name: profileData.display_name ?? null,
          avatar_url: profileData.avatar_url ?? null,
          user_id: profileData.user_id ?? null,
          phone: profileData.phone ?? null,
          bio: profileData.bio ?? null,
          main_instrument: profileData.main_instrument ?? null,
          owned_gear: profileData.owned_gear ?? null,
          owned_gear_images: (profileData.owned_gear_images as string[] | null) ?? null,
          band_name: profileData.band_name ?? null,
          band_url: profileData.band_url ?? null,
          sns_twitter: profileData.sns_twitter ?? null,
          sns_instagram: profileData.sns_instagram ?? null,
          sns_youtube: profileData.sns_youtube ?? null,
          sns_twitch: profileData.sns_twitch ?? null,
          contact_email: profileData.contact_email ?? null,
          created_at: profileData.created_at ?? "",
          updated_at: profileData.updated_at ?? "",
        } as Profile);
      }

      const reviews: Review[] = reviewsSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            author_id: data.author_id ?? "",
            category_id: data.category_id ?? "",
            maker_id: data.maker_id ?? null,
            maker_name: (data.maker_name as string | null) ?? null,
            title: data.title ?? "",
            gear_name: data.gear_name ?? "",
            rating: data.rating ?? 0,
            body_md: data.body_md ?? null,
            body_html: data.body_html ?? null,
            created_at: data.created_at ?? "",
            updated_at: data.updated_at ?? "",
            categories: data.category_name_ja
              ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
              : undefined,
            review_images: (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ?? [],
          } as Review;
        })
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      setMyReviews(reviews);

      const myReviewIdArray = reviewsSnap.docs.map((d) => d.id);
      let likes = 0;
      for (let i = 0; i < myReviewIdArray.length; i += 10) {
        const chunk = myReviewIdArray.slice(i, i + 10);
        const snap = await getDocs(
          query(collection(db, "review_likes"), where("review_id", "in", chunk))
        );
        likes += snap.size;
      }
      setTotalLikes(likes);

      const likedReviewIds = likesSnap.docs.map((d) => d.data().review_id).filter(Boolean);
      const likedList: Review[] = [];
      const reviewPromises = likedReviewIds.slice(0, 50).map((reviewId) =>
        getDoc(doc(db, "reviews", reviewId)).then((snap) => {
          if (!snap.exists()) return null;
          const data = snap.data()!;
          return {
            id: snap.id,
            author_id: data.author_id ?? "",
            category_id: data.category_id ?? "",
            maker_id: data.maker_id ?? null,
            maker_name: (data.maker_name as string | null) ?? null,
            title: data.title ?? "",
            gear_name: data.gear_name ?? "",
            rating: data.rating ?? 0,
            body_md: data.body_md ?? null,
            body_html: data.body_html ?? null,
            created_at: data.created_at ?? "",
            updated_at: data.updated_at ?? "",
            categories: data.category_name_ja
              ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
              : undefined,
            review_images: (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ?? [],
          } as Review;
        })
      );
      const results = await Promise.all(reviewPromises);
      likedList.push(...results.filter((r): r is Review => r != null));
      setLikedReviews(likedList);

      const events: LiveEvent[] = eventsSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            user_id: data.user_id ?? "",
            title: data.title ?? "",
            event_date: data.event_date ?? "",
            venue: data.venue ?? null,
            venue_url: data.venue_url ?? null,
            description: data.description ?? null,
            start_time: data.start_time ?? null,
            end_time: data.end_time ?? null,
            created_at: data.created_at ?? "",
            updated_at: data.updated_at ?? "",
          } as LiveEvent;
        })
        .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
      setLiveEvents(events);
      setLoading(false);
    })();
  }, [user, authLoading, db, router]);

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url ?? user?.photoURL ?? null;
  const displayName = profile?.display_name ?? user?.displayName ?? user?.email?.split("@")[0] ?? "ユーザー";
  const userId = profile?.user_id ?? null;

  const gearOptions = myReviews.map((r) => ({
    id: r.id,
    label: r.gear_name || r.title,
    maker_name: (r.maker_name as string | null) ?? null,
    gear_name: r.gear_name,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="font-display text-2xl font-bold text-white">マイページ</h1>

      {/* アカウント情報・アイコン */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">アカウント情報</CardTitle>
          <CardDescription>
            プロフィール編集で表示名・アイコン・自己紹介を変更できます。気になるレビューは比較リストに追加して、一覧で比べられます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0">
            {avatarUrl ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-electric-blue/50 bg-surface-card">
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-full border-2 border-electric-blue/50 bg-surface-card flex items-center justify-center text-2xl font-bold text-electric-blue"
                aria-hidden
              >
                {displayName.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-white font-medium text-lg truncate">
              {userId ? `${displayName} @${userId}` : displayName}
            </p>
            {user?.email && (
              <p className="text-gray-500 text-sm truncate">{user.email}</p>
            )}
            {profile?.main_instrument && (
              <p className="text-sm text-gray-400">担当: {profile.main_instrument}</p>
            )}
            {profile?.band_name && (
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
            {profile?.bio && (
              <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-3">{profile.bio}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile">プロフィールを編集</Link>
              </Button>
              {userId && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowProfilePreview(true)}>
                    他の人からはこう見えますよ
                  </Button>
                  <ProfilePreviewOverlay
                    userId={userId}
                    open={showProfilePreview}
                    onClose={() => setShowProfilePreview(false)}
                  />
                </>
              )}
              <Button variant="secondary" size="sm" asChild>
                <Link href="/reviews/compare">比較リストを見る</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ボード・所有機材（閲覧専用） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">ボード・所有機材</CardTitle>
          <CardDescription>
            現在使っているボード構成や所有機材です。編集は
            <Link href="/profile" className="text-electric-blue hover:underline mx-1">
              プロフィール編集
            </Link>
            で行えます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.owned_gear || (profile?.owned_gear_images && profile.owned_gear_images.length > 0) ? (
            <div className="space-y-3">
              {profile?.owned_gear && (
                <ul className="space-y-1 text-sm text-gray-200">
                  {profile.owned_gear
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-[3px] text-electric-blue shrink-0">•</span>
                        <span className="whitespace-pre-wrap">{line}</span>
                      </li>
                    ))}
                </ul>
              )}
              {profile?.owned_gear_images && profile.owned_gear_images.length > 0 && (
                <div className={`flex flex-wrap gap-2 ${profile?.owned_gear ? "mt-3" : ""}`}>
                  {profile.owned_gear_images.map((url) => (
                    <div
                      key={url}
                      className="relative w-24 h-24 rounded-md overflow-hidden border border-surface-border"
                    >
                      <Image src={url} alt="" fill className="object-cover" sizes="96px" unoptimized />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              まだ所有機材が登録されていません。
              <Link href="/profile" className="text-electric-blue hover:underline ml-1">
                プロフィール編集
              </Link>
              で追加できます。
            </p>
          )}
        </CardContent>
      </Card>

      {/* お気に入りにした記事 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">お気に入りにした記事</CardTitle>
          <CardDescription>いいねしたレビュー一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {likedReviews.length === 0 ? (
            <p className="text-gray-500 text-sm">まだいいねした記事がありません。</p>
          ) : (
            <ul className="space-y-3">
              {likedReviews.map((r) => {
                const imageUrl = getFirstReviewImageUrl(r);
                const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/reviews/${r.id}`}
                      className="flex gap-3 rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden hover:border-electric-blue/50 transition-colors"
                    >
                      <div className="relative w-24 shrink-0 aspect-[400/260] bg-surface-card">
                        {imageUrl ? (
                          <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" />
                        ) : (
                          <Image src={PLACEHOLDER_IMG} alt="" fill className="object-cover" sizes="96px" unoptimized />
                        )}
                      </div>
                      <div className="min-w-0 py-3 pr-3 flex-1">
                        <p className="font-medium text-white line-clamp-1">{r.title}</p>
                        <p className="text-sm text-gray-400">{r.gear_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {showStars && <StarRating rating={r.rating} />}
                          <span className="text-xs text-gray-500">
                            {r.categories && "name_ja" in r.categories
                              ? (r.categories as { name_ja: string }).name_ja
                              : ""}
                            {" · "}
                            {new Date(r.created_at).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 過去に投稿した内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">過去に投稿した内容</CardTitle>
          <CardDescription>自分が投稿した機材・レビュー一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {myReviews.length === 0 ? (
            <p className="text-gray-500 text-sm">まだ投稿がありません。</p>
          ) : (
            <ul className="space-y-3">
              {myReviews.map((r) => {
                const imageUrl = getFirstReviewImageUrl(r);
                const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/reviews/${r.id}`}
                      className="flex gap-3 rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden hover:border-electric-blue/50 transition-colors"
                    >
                      <div className="relative w-24 shrink-0 aspect-[400/260] bg-surface-card">
                        {imageUrl ? (
                          <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" />
                        ) : (
                          <Image src={PLACEHOLDER_IMG} alt="" fill className="object-cover" sizes="96px" unoptimized />
                        )}
                      </div>
                      <div className="min-w-0 py-3 pr-3 flex-1">
                        <p className="font-medium text-white line-clamp-1">{r.title}</p>
                        <p className="text-sm text-gray-400">{r.gear_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {showStars && <StarRating rating={r.rating} />}
                          <span className="text-xs text-gray-500">
                            {r.categories && "name_ja" in r.categories
                              ? (r.categories as { name_ja: string }).name_ja
                              : ""}
                            {" · "}
                            {new Date(r.created_at).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reviews/new">新規投稿</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* レビューにもらったイイね */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">レビューにもらったイイね</CardTitle>
          <CardDescription>自分の投稿へのいいね合計</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">{totalLikes}</p>
        </CardContent>
      </Card>

      {/* マイカレンダー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">マイカレンダー</CardTitle>
          <CardDescription>ライブ予定を追加してカレンダーで管理</CardDescription>
        </CardHeader>
        <CardContent>
          <LiveEventCalendar initialEvents={liveEvents} />
        </CardContent>
      </Card>
    </div>
  );
}
