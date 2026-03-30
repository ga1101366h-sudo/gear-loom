"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { collection, query, where, getDocs, documentId, type QuerySnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyPageGearTab } from "@/app/mypage/MyPageGearTab";
import { MyPageReviewTab } from "@/app/mypage/MyPageReviewTab";
import { MyPageLogTab } from "@/app/mypage/MyPageLogTab";
import { MyPageToolsTab } from "@/app/mypage/MyPageToolsTab";
import { Suspense } from "react";
import { Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { ProfilePreviewOverlay } from "@/components/profile-preview-overlay";
import { fetchFollowingTimelineClient, type TimelineItem } from "@/lib/firebase/follow-timeline-client";
import {
  fetchFollowingListClient,
  fetchFollowersListClient,
  type FollowListItem,
} from "@/lib/firebase/follow-list-client";
import { FollowButton } from "@/components/follow-button";
import type { Profile } from "@/types/database";
import type { Review } from "@/types/database";
import type { LiveEvent } from "@/types/database";
import type { UserGearItem } from "@/types/gear";

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
  const [mypageGears, setMypageGears] = useState<UserGearItem[]>([]);
  const [mypageBoards, setMypageBoards] = useState<{
    id: string;
    name: string;
    thumbnail: string | null;
    actualPhotoUrl: string | null;
    nodes?: string | null;
    edges?: string | null;
    updatedAt: string;
  }[]>([]);
  const [mypageBoardPosts, setMypageBoardPosts] = useState<{ id: string; title: string; content: string | null; updatedAt: string; boardId: string; boardName: string }[]>([]);
  const [likedBoardPosts, setLikedBoardPosts] = useState<{ postId: string; title: string; thumbnailUrl: string | null }[]>([]);
  const [followListModal, setFollowListModal] = useState<"following" | "followers" | null>(null);
  const [followingList, setFollowingList] = useState<FollowListItem[]>([]);
  const [followersList, setFollowersList] = useState<FollowListItem[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [mypageTabValue, setMypageTabValue] = useState("gear");

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

  type MypageBoardItem = {
    id: string;
    name: string;
    thumbnail: string | null;
    actualPhotoUrl: string | null;
    nodes?: string | null;
    edges?: string | null;
    updatedAt: string;
  };
  type MypageBoardPostItem = {
    id: string;
    title: string;
    content: string | null;
    updatedAt: string;
    boardId: string;
    boardName: string;
    thumbnailUrl?: string | null;
  };
  type LikedBoardPostItem = { postId: string; title: string; thumbnailUrl: string | null };
  type MypageData = {
    profile: Profile | null;
    followingCount: number;
    followersCount: number;
    myReviews: Review[];
    totalLikes: number;
    likedReviews: Review[];
    likedBoardPosts: LikedBoardPostItem[];
    liveEvents: LiveEvent[];
    timelineItems: TimelineItem[];
    gears: UserGearItem[];
    boards: MypageBoardItem[];
    boardPosts: MypageBoardPostItem[];
  };

  const { data: mypageData, isLoading: swrLoading } = useSWR<MypageData>(
    user && db ? ["mypage", user.uid] : null,
    async (): Promise<MypageData> => {
      const uid = user!.uid;
      const token = await user!.getIdToken(true);
      // 一部の取得（例: board_likes の permission-denied）が失敗しても他は表示するため Promise.allSettled を使用
      const settled = await Promise.allSettled([
        fetch("/api/me/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/me/follow-counts", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/user/gears", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/me/boards", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/me/board-posts", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        getDocs(query(collection(db!, "reviews"), where("author_id", "==", uid))),
        getDocs(query(collection(db!, "review_likes"), where("user_id", "==", uid))),
        getDocs(query(collection(db!, "board_likes"), where("user_id", "==", uid))),
        getDocs(query(collection(db!, "live_events"), where("user_id", "==", uid))),
      ]);

      const getResponse = (i: number) => (settled[i].status === "fulfilled" ? settled[i].value : null);
      const profileRes = getResponse(0) as Response | null;
      const followCountsRes = getResponse(1) as Response | null;
      const gearsRes = getResponse(2) as Response | null;
      const boardsRes = getResponse(3) as Response | null;
      const boardPostsRes = getResponse(4) as Response | null;
      const reviewsSnap = (settled[5].status === "fulfilled" ? settled[5].value : { docs: [] }) as { docs: { id: string; data: () => Record<string, unknown> }[] };
      const likesSnap = (settled[6].status === "fulfilled" ? settled[6].value : { docs: [] }) as { docs: { id: string; data: () => Record<string, unknown> }[] };
      const boardLikesSnap = (settled[7].status === "fulfilled" ? settled[7].value : { docs: [] }) as { docs: { id: string; data: () => Record<string, unknown> }[] };
      const eventsSnap = (settled[8].status === "fulfilled" ? settled[8].value : { docs: [] }) as { docs: { id: string; data: () => Record<string, unknown> }[] };

      let profile: Profile | null = null;
      if (profileRes?.ok) {
        try {
          const json = (await profileRes.json()) as { profile: Profile | null };
          profile = json.profile ?? null;
        } catch {
          // ignore
        }
      }

      let followingCount = 0;
      let followersCount = 0;
      if (followCountsRes?.ok) {
        try {
          const countsData = (await followCountsRes.json()) as { followingCount?: number; followersCount?: number };
          followingCount = countsData.followingCount ?? 0;
          followersCount = countsData.followersCount ?? 0;
        } catch {
          // ignore
        }
      }

      let gears: UserGearItem[] = [];
      if (gearsRes?.ok) {
        try {
          const parsed = (await gearsRes.json()) as UserGearItem[];
          gears = Array.isArray(parsed) ? parsed : [];
        } catch {
          // ignore
        }
      }

      let boards: MypageBoardItem[] = [];
      if (boardsRes?.ok) {
        try {
          const json = (await boardsRes.json()) as { boards?: MypageBoardItem[] };
          boards = Array.isArray(json.boards) ? json.boards : [];
        } catch {
          // ignore
        }
      }

      let boardPosts: MypageBoardPostItem[] = [];
      if (boardPostsRes?.ok) {
        try {
          const json = (await boardPostsRes.json()) as { boardPosts?: MypageBoardPostItem[] };
          boardPosts = Array.isArray(json.boardPosts) ? json.boardPosts : [];
        } catch {
          // ignore
        }
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

      // 自分のレビューに対する「いいね」数集計（Firestore への問い合わせをチャンクごとに並列実行）
      let totalLikes = 0;
      try {
        const myReviewIdArray = reviewsSnap.docs.map((d) => d.id);
        if (myReviewIdArray.length > 0) {
          const likeQueryPromises: Promise<QuerySnapshot>[] = [];
          for (let i = 0; i < myReviewIdArray.length; i += 10) {
            const chunk = myReviewIdArray.slice(i, i + 10);
            likeQueryPromises.push(
              getDocs(query(collection(db!, "review_likes"), where("review_id", "in", chunk))),
            );
          }
          const likeSnaps = await Promise.allSettled(likeQueryPromises);
          totalLikes = likeSnaps.reduce(
            (sum, result) => sum + (result.status === "fulfilled" ? result.value.size : 0),
            0,
          );
        }
      } catch {
        // 集計失敗時は 0 のまま
      }

      // 自分が「いいね」したレビュー一覧（こちらもチャンクごとに並列取得）
      const likedList: Review[] = [];
      try {
        const likedReviewIds = likesSnap.docs
          .map((d) => d.data().review_id as string)
          .filter(Boolean)
          .slice(0, 50);
        if (likedReviewIds.length > 0) {
          const likedQueryPromises: Promise<QuerySnapshot>[] = [];
          for (let i = 0; i < likedReviewIds.length; i += 10) {
            const chunk = likedReviewIds.slice(i, i + 10);
            likedQueryPromises.push(
              getDocs(query(collection(db!, "reviews"), where(documentId(), "in", chunk))),
            );
          }
          const likedSnaps = await Promise.allSettled(likedQueryPromises);
          likedSnaps.forEach((result) => {
            if (result.status !== "fulfilled") return;
            result.value.docs.forEach((d) => {
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
                  ? {
                      id: "",
                      slug: (data.category_slug as string) ?? "",
                      name_ja: data.category_name_ja,
                      name_en: null,
                      sort_order: 0,
                      created_at: "",
                    }
                  : undefined,
                review_images:
                  (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ??
                  [],
              } as Review);
            });
          });
        }
      } catch {
        // 取得失敗時は空のまま
      }

      const likedBoardPosts: LikedBoardPostItem[] = boardLikesSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            postId: (data.post_id as string) ?? "",
            title: (data.title as string) ?? "エフェクターボード",
            thumbnailUrl: (data.thumbnail_url as string | null) ?? null,
          };
        })
        .filter((b) => b.postId);

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
        likedBoardPosts,
        liveEvents: events,
        timelineItems: timeline,
        gears,
        boards,
        boardPosts,
      };
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 60_000 }
  );

  // スマホで公開プレビュー（iframe）を開いたときに Firebase の user が一瞬 null になることがあるため、
  // 即リダイレクトせず短い遅延を入れる。またプレビュー表示中はリダイレクトしない。
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    if (showProfilePreview) return;
    const t = setTimeout(() => {
      router.push("/login?next=/mypage");
    }, 400);
    return () => clearTimeout(t);
  }, [authLoading, user, showProfilePreview, router]);

  useEffect(() => {
    if (mypageData) {
      setProfile(mypageData.profile);
      setFollowingCount(mypageData.followingCount);
      setFollowersCount(mypageData.followersCount);
      setMyReviews(mypageData.myReviews);
      setTotalLikes(mypageData.totalLikes);
      setLikedReviews(mypageData.likedReviews);
      setLikedBoardPosts(mypageData.likedBoardPosts ?? []);
      setLiveEvents(mypageData.liveEvents);
      setTimelineItems(mypageData.timelineItems);
      setMypageGears(mypageData.gears ?? []);
      setMypageBoards(mypageData.boards ?? []);
      setMypageBoardPosts(mypageData.boardPosts ?? []);
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
            プロフィール編集で表示名・アイコン・自己紹介を変更できます。
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
          <div className="space-y-4 min-w-0 flex-1">
            <div className="space-y-1">
              <p className="text-xl font-bold text-white truncate">
                {displayName}
              </p>
              {userId && (
                <p className="text-sm text-muted-foreground truncate">@{userId}</p>
              )}
              {user?.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
            {(profile?.main_instrument || profile?.band_name) && (
              <div className="flex flex-wrap gap-2">
                {profile?.main_instrument && (
                  <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-gray-200">
                    担当: {profile.main_instrument}
                  </span>
                )}
                {profile?.band_name && (
                  <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-gray-200">
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
                  </span>
                )}
              </div>
            )}
            {profile?.bio && (
              <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-3">{profile.bio}</p>
            )}
            {/* フォロー数・フォロワー（純粋テキスト、クリックで一覧モーダル・枠線なし） */}
            <div className="flex gap-4 text-sm border-t border-surface-border/60 pt-4 mt-4">
              <p
                role="button"
                tabIndex={0}
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
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                className="m-0 cursor-pointer hover:underline focus:outline-none focus:underline"
              >
                <span className="font-bold text-white">{followingCount}</span>{" "}
                <span className="text-gray-400">フォロー中</span>
              </p>
              <p
                role="button"
                tabIndex={0}
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
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                className="m-0 cursor-pointer hover:underline focus:outline-none focus:underline"
              >
                <span className="font-bold text-white">{followersCount}</span>{" "}
                <span className="text-gray-400">フォロワー</span>
              </p>
            </div>
            {/* 操作ボタン（プロフィール編集・公開プレビューのみ、フォロー表記と視覚的に分離） */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-surface-border/60">
              <Button variant="outline" size="sm" className="min-h-10" asChild>
                <Link href="/profile">プロフィールを編集</Link>
              </Button>
              {userId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowProfilePreview(true);
                    }}
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

      {/* 4タブ: 機材 / 投稿 / ツール / アクティビティ */}
      <Tabs value={mypageTabValue} onValueChange={setMypageTabValue} className="w-full">
        <div className="overflow-x-auto scrollbar-hide min-w-0 -mx-1 px-1">
          <TabsList className="w-max min-w-full inline-flex flex-nowrap justify-start gap-0 shrink-0 border-b border-surface-border bg-transparent">
            <TabsTrigger value="gear" className="shrink-0">機材</TabsTrigger>
            <TabsTrigger value="review" className="shrink-0">投稿</TabsTrigger>
            <TabsTrigger value="tools" className="shrink-0">ツール</TabsTrigger>
            <TabsTrigger value="activity" className="shrink-0">アクティビティ</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="gear" className="mt-6">
          <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>}>
            <MyPageGearTab
              mypageBoards={mypageBoards}
              swrKey={user ? ["mypage", user.uid] : null}
              profile={profile}
              mypageGears={mypageGears}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>}>
            <MyPageReviewTab
              myReviews={myReviews}
              totalLikes={totalLikes}
              mypageBoardPosts={mypageBoardPosts}
              swrKey={user ? ["mypage", user.uid] : null}
              onSwitchToGearTab={() => setMypageTabValue("gear")}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>}>
            <MyPageToolsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>}>
            <MyPageLogTab
              likedReviews={likedReviews}
              likedBoardPosts={likedBoardPosts}
              liveEvents={liveEvents}
              sortedCalendarEvents={sortedCalendarEvents}
              timelineItems={timelineItems}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
