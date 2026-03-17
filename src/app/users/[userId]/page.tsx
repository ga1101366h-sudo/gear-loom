import { notFound } from "next/navigation";
import {
  getProfileByUserIdFromFirestore,
  getLiveEventsByUserIdFromFirestore,
  getReviewsByAuthorIdFromFirestore,
  getFollowCountsFromFirestore,
  getReviewLikeCountsForIdsFromFirestore,
  getBoardPostsWithLikesByUserUid,
} from "@/lib/firebase/data";
import { getGearsByUserId } from "@/lib/user-gears";
import { getPublishedBoardsByUserUid } from "@/lib/board-public";
import { PublicProfileView } from "@/components/public-profile-view";
import type { ReviewWithLikeCount } from "@/components/public-profile-view";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const decoded = decodeURIComponent(userId);
  const profile = await getProfileByUserIdFromFirestore(decoded);
  if (!profile) notFound();

  let events: Awaited<ReturnType<typeof getLiveEventsByUserIdFromFirestore>> = [];
  let reviews: Awaited<ReturnType<typeof getReviewsByAuthorIdFromFirestore>> = [];
  let followCounts = { followersCount: 0, followingCount: 0 };
  let gears: Awaited<ReturnType<typeof getGearsByUserId>> = [];
  let boards: Awaited<ReturnType<typeof getPublishedBoardsByUserUid>> = [];
  let boardPostsWithLikes: Awaited<ReturnType<typeof getBoardPostsWithLikesByUserUid>> = {
    posts: [],
    totalLikes: 0,
  };

  try {
    const [eventsRes, reviewsRes, followCountsRes, gearsRes, boardsRes, boardPostsRes] =
      await Promise.all([
        getLiveEventsByUserIdFromFirestore(profile.id),
        getReviewsByAuthorIdFromFirestore(profile.id),
        getFollowCountsFromFirestore(profile.id),
        getGearsByUserId(profile.id),
        getPublishedBoardsByUserUid(profile.id),
        getBoardPostsWithLikesByUserUid(profile.id),
      ]);
    events = eventsRes;
    reviews = reviewsRes;
    followCounts = followCountsRes;
    gears = gearsRes;
    boards = boardsRes;
    boardPostsWithLikes = boardPostsRes;
  } catch (err) {
    console.error("[PublicProfilePage] data fetch error (continuing as guest view):", err);
  }

  let reviewsWithLikes: ReviewWithLikeCount[] = reviews.map((r) => ({ ...r, likeCount: 0 }));
  if (reviews.length > 0) {
    try {
      const reviewIds = reviews.map((r) => r.id);
      const likeCountsMap = await getReviewLikeCountsForIdsFromFirestore(reviewIds);
      reviewsWithLikes = reviews.map((r) => ({
        ...r,
        likeCount: likeCountsMap[r.id] ?? 0,
      }));
    } catch {
      // いいね数は0のまま表示
    }
  }

  return (
    <PublicProfileView
      profile={profile}
      events={events}
      reviews={reviewsWithLikes}
      followersCount={followCounts.followersCount}
      followingCount={followCounts.followingCount}
      gears={gears}
      boards={boards}
      boardPosts={boardPostsWithLikes.posts}
      totalBoardLikes={boardPostsWithLikes.totalLikes}
    />
  );
}

