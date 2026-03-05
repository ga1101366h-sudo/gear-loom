import { notFound } from "next/navigation";
import {
  getProfileByUserIdFromFirestore,
  getLiveEventsByUserIdFromFirestore,
  getReviewsByAuthorIdFromFirestore,
  getFollowCountsFromFirestore,
  getReviewLikeCountsForIdsFromFirestore,
} from "@/lib/firebase/data";
import { EmbedProfileClient } from "@/components/embed-profile-client";
import type { ReviewWithLikeCount } from "@/components/public-profile-view";

export default async function EmbedProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getProfileByUserIdFromFirestore(decodeURIComponent(userId));
  if (!profile) notFound();
  const [events, reviews, followCounts] = await Promise.all([
    getLiveEventsByUserIdFromFirestore(profile.id),
    getReviewsByAuthorIdFromFirestore(profile.id),
    getFollowCountsFromFirestore(profile.id),
  ]);
  const reviewIds = reviews.map((r) => r.id);
  const likeCountsMap =
    reviewIds.length > 0 ? await getReviewLikeCountsForIdsFromFirestore(reviewIds) : {};
  const reviewsWithLikes: ReviewWithLikeCount[] = reviews.map((r) => ({
    ...r,
    likeCount: likeCountsMap[r.id] ?? 0,
  }));
  return (
    <EmbedProfileClient
      profile={profile}
      events={events}
      reviews={reviewsWithLikes}
      initialFollowersCount={followCounts.followersCount}
      initialFollowingCount={followCounts.followingCount}
    />
  );
}
