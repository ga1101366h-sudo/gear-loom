import { notFound } from "next/navigation";
import {
  getProfileByUserIdFromFirestore,
  getLiveEventsByUserIdFromFirestore,
  getReviewsByAuthorIdFromFirestore,
} from "@/lib/firebase/data";
import { PublicProfileView } from "@/components/public-profile-view";

export default async function EmbedProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getProfileByUserIdFromFirestore(decodeURIComponent(userId));
  if (!profile) notFound();
  const [events, reviews] = await Promise.all([
    getLiveEventsByUserIdFromFirestore(profile.id),
    getReviewsByAuthorIdFromFirestore(profile.id),
  ]);
  return <PublicProfileView profile={profile} events={events} reviews={reviews} />;
}
