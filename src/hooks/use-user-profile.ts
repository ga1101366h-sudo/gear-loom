"use client";

import useSWR from "swr";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";

type UserProfile = {
  display_name?: string | null;
  user_id?: string | null;
  avatar_url?: string | null;
  owned_gear?: string | null;
  [key: string]: unknown;
} | null;

async function fetchUserProfile(uid: string): Promise<UserProfile> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  const snap = await getDoc(doc(db, "profiles", uid));
  return (snap.exists() ? (snap.data() as UserProfile) : null) ?? null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const { data, error, isValidating, mutate } = useSWR(
    uid ? ["profiles", uid] : null,
    ([, id]) => fetchUserProfile(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  return {
    profile: data,
    loading: !!uid && !data && !error && isValidating,
    error,
    refresh: () => mutate(),
  };
}

