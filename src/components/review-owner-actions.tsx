"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function ReviewOwnerActions({
  reviewId,
  authorId,
}: {
  reviewId: string;
  authorId: string;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.uid !== authorId) return null;

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/reviews/${reviewId}/edit`}>編集</Link>
    </Button>
  );
}

