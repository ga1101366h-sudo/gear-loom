"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { isContentOnlyCategorySlug, getCategoryIconNameByDisplayLabel, getCategoryPathDisplay } from "@/data/post-categories";
import { getCategoryGroupIcon } from "@/lib/category-group-icons";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings2 } from "lucide-react";
import { LiveEventCalendar } from "@/components/live-event-calendar";
import { ProfilePreviewOverlay } from "@/components/profile-preview-overlay";
import {
  fetchFollowingTimelineClient,
  getFirstReviewImageUrl as getTimelineReviewImageUrl,
  type TimelineItem,
} from "@/lib/firebase/follow-timeline-client";
import {
  fetchFollowingListClient,
  fetchFollowersListClient,
  type FollowListItem,
} from "@/lib/firebase/follow-list-client";
import { FollowButton } from "@/components/follow-button";
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

/** ゼロ件時も枠を表示するための空状態エリア */
const EMPTY_SECTION_CLASS =
  "min-h-[72px] flex items-center rounded-lg border border-dashed border-surface-border bg-surface-card/20 px-4 py-4 text-gray-500 text-sm";

const CAROUSEL_PAGE_SIZE = 5;

function CarouselNav({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onPrev}
        disabled={currentPage <= 0}
        aria-label="前へ"
      >
        ‹
      </Button>
      <span className="text-xs text-gray-500 tabular-nums">
        {currentPage + 1} / {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        aria-label="次へ"
      >
        ›
      </Button>
    </div>
  );
}

function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
}

function MypageFollowListItem({
  item,
  onUnfollow,
  onFollow,
  showUnfollowButton,
}: {
  item: FollowListItem;
  onUnfollow?: () => void;
  /** フォロワー一覧でフォローボタンを押してフォローしたときに呼ばれ、フォロー中カウントを+1する */
  onFollow?: () => void;
  showUnfollowButton?: boolean;
}) {
  const profileHref = item.user_id ? `/users/${encodeURIComponent(item.user_id)}` : null;
  const displayLabel = item.display_name || item.user_id || "ユーザー";
  const handleFollowChange = (isFollowing: boolean) => {
    if (!isFollowing && showUnfollowButton) onUnfollow?.();
    if (isFollowing) onFollow?.();
  };
  return (
    <li className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-card/50 px-3 py-2">
      {item.avatar_url ? (
        <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden bg-surface-card">
          <Image src={item.avatar_url} alt="" fill className="object-cover" sizes="40px" unoptimized />
        </div>
      ) : (
        <div className="w-10 h-10 shrink-0 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-electric-blue font-bold text-sm">
          {displayLabel.charAt(0).toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {profileHref ? (
          <Link href={profileHref} className="font-medium text-white hover:text-electric-blue truncate block">
            {displayLabel}
          </Link>
        ) : (
          <span className="font-medium text-white truncate block">{displayLabel}</span>
        )}
        {item.user_id && (
          <p className="text-xs text-gray-500 truncate">@{item.user_id}</p>
        )}
      </div>
      <FollowButton
        targetProfileUid={item.uid}
        onFollowChange={handleFollowChange}
        className="shrink-0"
      />
    </li>
  );
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
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followListModal, setFollowListModal] = useState<"following" | "followers" | null>(null);
  const [followingList, setFollowingList] = useState<FollowListItem[]>([]);
  const [followersList, setFollowersList] = useState<FollowListItem[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [timelinePage, setTimelinePage] = useState(0);
  const [likedPage, setLikedPage] = useState(0);
  const [myReviewsPage, setMyReviewsPage] = useState(0);
  const [calendarPage, setCalendarPage] = useState(0);

  const sortedCalendarEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = liveEvents
      .filter((e) => (e.event_date || "") >= today)
      .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
    const past = liveEvents
      .filter((e) => (e.event_date || "") < today)
      .sort((a, b) => (b.event_date || "").localeCompare(a.event_date || ""));
    return [...upcoming, ...past];
  }, [liveEvents]);

  type MypageData = {
    profile: Profile | null;
    followingCount: number;
    followersCount: number;
    myReviews: Review[];
    totalLikes: number;
    likedReviews: Review[];
    liveEvents: LiveEvent[];
    timelineItems: TimelineItem[];
  };

  const { data: mypageData, isLoading: swrLoading } = useSWR<MypageData>(
    user && db ? ["mypage", user.uid] : null,
    async (): Promise<MypageData> => {
      const uid = user!.uid;
      const token = await user!.getIdToken(true);
      const [profileRes, followCountsRes, reviewsSnap, likesSnap, eventsSnap] = await Promise.all([
        fetch("/api/me/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/me/follow-counts", { headers: { Authorization: `Bearer ${token}` } }),
        getDocs(query(collection(db!, "reviews"), where("author_id", "==", uid))),
        getDocs(query(collection(db!, "review_likes"), where("user_id", "==", uid))),
        getDocs(query(collection(db!, "live_events"), where("user_id", "==", uid))),
      ]);

      let profile: Profile | null = null;
      if (profileRes.ok) {
        const json = (await profileRes.json()) as { profile: Profile | null };
        profile = json.profile ?? null;
      }
      let followingCount = 0;
      let followersCount = 0;
      if (followCountsRes.ok) {
        const countsData = (await followCountsRes.json()) as { followingCount?: number; followersCount?: number };
        followingCount = countsData.followingCount ?? 0;
        followersCount = countsData.followersCount ?? 0;
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

      let totalLikes = 0;
      const myReviewIdArray = reviewsSnap.docs.map((d) => d.id);
      for (let i = 0; i < myReviewIdArray.length; i += 10) {
        const chunk = myReviewIdArray.slice(i, i + 10);
        const snap = await getDocs(query(collection(db!, "review_likes"), where("review_id", "in", chunk)));
        totalLikes += snap.size;
      }

      const likedReviewIds = likesSnap.docs.map((d) => d.data().review_id as string).filter(Boolean).slice(0, 50);
      const likedList: Review[] = [];
      for (let i = 0; i < likedReviewIds.length; i += 10) {
        const chunk = likedReviewIds.slice(i, i + 10);
        const revSnap = await getDocs(
          query(collection(db!, "reviews"), where(documentId(), "in", chunk))
        );
        revSnap.docs.forEach((d) => {
          const data = d.data();
          likedList.push({
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
          } as Review);
        });
      }

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
      let timeline: TimelineItem[] = [];
      try {
        timeline = await fetchFollowingTimelineClient(uid, 50);
      } catch {
        // タイムライン取得失敗時は空
      }
      return {
        profile,
        followingCount,
        followersCount,
        myReviews: reviews,
        totalLikes,
        likedReviews: likedList,
        liveEvents: events,
        timelineItems: timeline,
      };
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 60_000 }
  );

  useEffect(() => {
    if (!user) router.push("/login?next=/mypage");
  }, [user, router]);

  useEffect(() => {
    if (mypageData) {
      setProfile(mypageData.profile);
      setFollowingCount(mypageData.followingCount);
      setFollowersCount(mypageData.followersCount);
      setMyReviews(mypageData.myReviews);
      setTotalLikes(mypageData.totalLikes);
      setLikedReviews(mypageData.likedReviews);
      setLiveEvents(mypageData.liveEvents);
      setTimelineItems(mypageData.timelineItems);
    }
  }, [mypageData]);

  const loading = authLoading || (user && db && swrLoading && !mypageData);

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
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" size="sm" className="w-full min-h-10" asChild>
                <Link href="/profile">プロフィールを編集</Link>
              </Button>
              {userId ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full min-h-10"
                    onClick={() => setShowProfilePreview(true)}
                  >
                    公開プレビュー
                  </Button>
                  <ProfilePreviewOverlay
                    userId={userId}
                    open={showProfilePreview}
                    onClose={() => setShowProfilePreview(false)}
                    followersCount={followersCount}
                    followingCount={followingCount}
                  />
                </>
              ) : (
                <div className="min-h-10" aria-hidden />
              )}
              <Button variant="secondary" size="sm" className="w-full min-h-10 col-span-2 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:border-gray-500" asChild>
                <Link href="/reviews/compare">比較リスト</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-10"
                onClick={async () => {
                  setFollowListModal("following");
                  setFollowListLoading(true);
                  try {
                    const list = user ? await fetchFollowingListClient(user.uid) : [];
                    setFollowingList(list);
                  } finally {
                    setFollowListLoading(false);
                  }
                }}
              >
                フォロー中 <span className="font-semibold text-electric-blue ml-0.5">{followingCount}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-10"
                onClick={async () => {
                  setFollowListModal("followers");
                  setFollowListLoading(true);
                  try {
                    const list = user ? await fetchFollowersListClient(user.uid) : [];
                    setFollowersList(list);
                  } finally {
                    setFollowListLoading(false);
                  }
                }}
              >
                フォロワー <span className="font-semibold text-electric-blue ml-0.5">{followersCount}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フォロー中・フォロワー一覧モーダル */}
      {followListModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={followListModal === "following" ? "フォロー中一覧" : "フォロワー一覧"}
          onClick={(e) => e.target === e.currentTarget && setFollowListModal(null)}
        >
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-electric-blue">
                {followListModal === "following" ? "フォロー中" : "フォロワー"}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFollowListModal(null)}
                className="shrink-0"
              >
                閉じる
              </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {followListLoading ? (
                <p className="text-gray-500 text-sm py-4">読み込み中...</p>
              ) : followListModal === "following" ? (
                followingList.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">フォローしているユーザーはいません。</p>
                ) : (
                  <ul className="space-y-2">
                    {followingList.map((item) => (
                      <MypageFollowListItem
                        key={item.uid}
                        item={item}
                        onUnfollow={() => {
                          setFollowingList((prev) => prev.filter((x) => x.uid !== item.uid));
                          setFollowingCount((c) => Math.max(0, c - 1));
                          setTimelineItems((prev) => prev.filter((t) => (t.type === "review" ? t.author_id : t.user_id) !== item.uid));
                        }}
                        showUnfollowButton
                      />
                    ))}
                  </ul>
                )
              ) : followListModal === "followers" && followersList.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">フォロワーはいません。</p>
              ) : followListModal === "followers" ? (
                <ul className="space-y-2">
                  {followersList.map((item) => (
                    <MypageFollowListItem
                      key={item.uid}
                      item={item}
                      onFollow={() => setFollowingCount((c) => c + 1)}
                    />
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* フォロー中タイムライン（5件表示・‹ ›で送り） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">フォロー中</CardTitle>
          <CardDescription>
            フォローしているユーザーの最新レビュー・ブログ・ライブ日程を時系列で表示
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-gray-500 text-sm">
                まだフォローしているユーザーがいないか、アクティビティがありません。プロフィールページからユーザーをフォローしてみましょう。
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {timelineItems
                  .slice(timelinePage * CAROUSEL_PAGE_SIZE, timelinePage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE)
                  .map((item) => {
                if (item.type === "review") {
                  const imageUrl = getTimelineReviewImageUrl(item);
                  const showStars = !isContentOnlyCategorySlug(item.category_id) && item.rating > 0;
                  const authorLabel = item.profile_display_name
                    ? item.profile_user_id
                      ? `${item.profile_display_name} @${item.profile_user_id}`
                      : item.profile_display_name
                    : "ユーザー";
                  return (
                    <li key={`review-${item.id}`}>
                      <Link
                        href={`/reviews/${item.id}`}
                        className="flex gap-3 rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden hover:border-cyan-500/50 transition-colors"
                      >
                        <div className="relative w-24 shrink-0 aspect-[400/260] bg-surface-card">
                          {imageUrl ? (
                            <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" unoptimized />
                          ) : (
                            <Image src={PLACEHOLDER_IMG} alt="" fill className="object-cover" sizes="96px" unoptimized />
                          )}
                        </div>
                        <div className="min-w-0 py-3 pr-3 flex-1">
                          <p className="font-medium text-white line-clamp-1">{item.title}</p>
                          <p className="text-sm text-gray-400">{item.gear_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{authorLabel}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {showStars && <StarRating rating={item.rating} />}
                            <span className="text-xs text-gray-500">
                              {item.category_name_ja ?? ""}
                              {" · "}
                              {item.created_at ? new Date(item.created_at).toLocaleDateString("ja-JP") : ""}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                }
                const authorLabel = item.profile_display_name
                  ? item.profile_user_id
                    ? `${item.profile_display_name} @${item.profile_user_id}`
                    : item.profile_display_name
                  : "ユーザー";
                return (
                  <li key={`event-${item.id}`}>
                    <div className="rounded-lg border border-surface-border bg-surface-card/50 px-3 py-3">
                      <p className="text-xs text-cyan-400/90 font-medium">ライブ予定</p>
                      <p className="font-medium text-white mt-0.5">{item.title}</p>
                      <p className="text-sm text-gray-400">
                        {item.event_date ? new Date(item.event_date).toLocaleDateString("ja-JP") : ""}
                        {item.venue && ` · ${item.venue}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{authorLabel}</p>
                    </div>
                  </li>
                );
              })}
              </ul>
              <CarouselNav
                currentPage={timelinePage}
                totalPages={Math.max(1, Math.ceil(timelineItems.length / CAROUSEL_PAGE_SIZE))}
                onPrev={() => setTimelinePage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setTimelinePage((p) =>
                    Math.min(Math.ceil(timelineItems.length / CAROUSEL_PAGE_SIZE) - 1, p + 1)
                  )
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ボード・所有機材（閲覧専用） */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-electric-blue">ボード・所有機材</CardTitle>
            <CardDescription>
              現在使っているボード構成や所有機材です。
            </CardDescription>
          </div>
          <Link
            href="/mypage/board/edit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors rounded-md text-sm font-medium shrink-0 w-fit"
          >
            <Settings2 className="w-4 h-4 shrink-0" aria-hidden />
            エフェクターボードを編集
          </Link>
        </CardHeader>
        <CardContent>
          {profile?.owned_gear || (profile?.owned_gear_images && profile.owned_gear_images.length > 0) ? (
            <div className="space-y-4">
              {profile?.owned_gear && (
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
                              <span className="px-2 py-0.5 bg-white/10 rounded-full text-gray-200">{category}</span>
                            </span>
                          )}
                          <span className="text-gray-200 whitespace-pre-wrap min-w-0 leading-tight text-sm md:text-base">{name}</span>
                        </div>
                      );
                    })}
                </div>
              )}
              {profile?.owned_gear_images && profile.owned_gear_images.length > 0 && (
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${profile?.owned_gear ? "mt-4" : ""}`}>
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
            </div>
          ) : (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-sm text-gray-500">
                まだ所有機材が登録されていません。
                <Link href="/profile" className="text-electric-blue hover:underline ml-1">
                  プロフィール編集
                </Link>
                で追加できます。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* お気に入りにした記事（5件表示・‹ ›で送り） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">お気に入りにした記事</CardTitle>
          <CardDescription>いいねしたレビュー一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {likedReviews.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-gray-500 text-sm">まだいいねした記事がありません。</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {likedReviews
                  .slice(likedPage * CAROUSEL_PAGE_SIZE, likedPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE)
                  .map((r) => {
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
                            {(r.categories && "slug" in r.categories
                              ? getCategoryPathDisplay((r.categories as { slug: string }).slug)
                              : r.category_id
                                ? getCategoryPathDisplay(r.category_id)
                                : "")}
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
              <CarouselNav
                currentPage={likedPage}
                totalPages={Math.max(1, Math.ceil(likedReviews.length / CAROUSEL_PAGE_SIZE))}
                onPrev={() => setLikedPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setLikedPage((p) =>
                    Math.min(Math.ceil(likedReviews.length / CAROUSEL_PAGE_SIZE) - 1, p + 1)
                  )
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* 過去に投稿した内容（5件表示・‹ ›で送り） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">過去に投稿した内容</CardTitle>
          <CardDescription>自分が投稿した機材・レビュー一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {myReviews.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-gray-500 text-sm">まだ投稿がありません。</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {myReviews
                  .slice(myReviewsPage * CAROUSEL_PAGE_SIZE, myReviewsPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE)
                  .map((r) => {
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
                            {(r.categories && "slug" in r.categories
                              ? getCategoryPathDisplay((r.categories as { slug: string }).slug)
                              : r.category_id
                                ? getCategoryPathDisplay(r.category_id)
                                : "")}
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
              <CarouselNav
                currentPage={myReviewsPage}
                totalPages={Math.max(1, Math.ceil(myReviews.length / CAROUSEL_PAGE_SIZE))}
                onPrev={() => setMyReviewsPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setMyReviewsPage((p) =>
                    Math.min(Math.ceil(myReviews.length / CAROUSEL_PAGE_SIZE) - 1, p + 1)
                  )
                }
              />
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/reviews/new">新規投稿</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* レビューにもらったイイね */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">レビューにもらったイイね</CardTitle>
          <CardDescription>自分の投稿へのいいね合計</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">{totalLikes} <span className="text-gray-500 text-base font-normal ml-1">件</span></p>
        </CardContent>
      </Card>

      {/* マイカレンダー（直近5件表示・‹ ›で送り。予定なし時はカレンダーのみ表示） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">マイカレンダー</CardTitle>
          <CardDescription>ライブ予定を追加してカレンダーで管理（直近の予定順）</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[120px]">
          {sortedCalendarEvents.length > 0 && (
            <>
              <ul className="space-y-2 mb-4">
                {sortedCalendarEvents
                  .slice(calendarPage * CAROUSEL_PAGE_SIZE, calendarPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE)
                  .map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-surface-border bg-surface-card/50 px-3 py-2"
                    >
                      <p className="font-medium text-white text-sm truncate">{ev.title}</p>
                      <p className="text-xs text-gray-400">
                        {ev.event_date ? new Date(ev.event_date).toLocaleDateString("ja-JP") : ""}
                        {ev.venue && ` · ${ev.venue}`}
                      </p>
                    </li>
                  ))}
              </ul>
              <CarouselNav
                currentPage={calendarPage}
                totalPages={Math.max(1, Math.ceil(sortedCalendarEvents.length / CAROUSEL_PAGE_SIZE))}
                onPrev={() => setCalendarPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setCalendarPage((p) =>
                    Math.min(Math.ceil(sortedCalendarEvents.length / CAROUSEL_PAGE_SIZE) - 1, p + 1)
                  )
                }
              />
              <div className="mt-4 pt-4 border-t border-surface-border">
                <LiveEventCalendar initialEvents={liveEvents} />
              </div>
            </>
          )}
          {sortedCalendarEvents.length === 0 && (
            <LiveEventCalendar initialEvents={liveEvents} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
