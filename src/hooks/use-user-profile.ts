"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";

type UserProfile = {
  id?: string;
  display_name?: string | null;
  user_id?: string | null;
  avatar_url?: string | null;
  owned_gear?: string | null;
  [key: string]: unknown;
} | null;

async function fetchUserProfileFromApi(
  uid: string,
  getIdToken: () => Promise<string | undefined>
): Promise<UserProfile> {
  const token = await getIdToken();
  if (!token) return null;
  const res = await fetch("/api/me/profile", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { profile } = (await res.json()) as { profile: UserProfile | null };
  return profile ?? null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const getIdToken = () => user?.getIdToken() ?? Promise.resolve(undefined);

  const { data, error, mutate } = useSWR(
    uid ? ["profiles", uid] : null,
    ([, id]) => fetchUserProfileFromApi(id, getIdToken),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0,
      shouldRetryOnError: false,
    }
  );

  const isLoading = !!uid && data === undefined && !error;

  return {
    profile: data ?? null,
    loading: isLoading,
    error,
    refresh: () => mutate(),
  };
}

