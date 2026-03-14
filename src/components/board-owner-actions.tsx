"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function BoardOwnerActions({
  postId,
  ownerId,
}: {
  postId: string;
  ownerId: string | null;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !ownerId || user.uid !== ownerId) return null;

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/boards/post/${postId}/edit`}>編集</Link>
    </Button>
  );
}

