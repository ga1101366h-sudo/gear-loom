import { notFound } from "next/navigation";
import { getProfileByUserIdFromFirestore, getLiveEventsByUserIdFromFirestore } from "@/lib/firebase/data";
import { PublicProfileView } from "@/components/public-profile-view";

export default async function EmbedProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getProfileByUserIdFromFirestore(decodeURIComponent(userId));
  if (!profile) notFound();
  const events = await getLiveEventsByUserIdFromFirestore(profile.id);
  return <PublicProfileView profile={profile} events={events} />;
}
