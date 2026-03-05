"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  NewReviewsCarousel,
  type NewReviewItem,
} from "@/components/new-reviews-carousel";
import { Card, CardContent } from "@/components/ui/card";

export function TopPageFollowingReviews() {
  const { user, loading: authLoading } = useAuth();
  const auth = getFirebaseAuth();
  const [items, setItems] = useState<NewReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !auth?.currentUser) {
      setLoading(false);
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    auth
      .currentUser!.getIdToken()
      .then((token) =>
        fetch("/api/me/following-reviews", {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, authLoading]);

  if (authLoading || !user) return null;

  return (
    <section className="min-w-0 overflow-hidden">
      <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
        フォロー中のユーザの記事
      </h2>
      <p className="mb-6 text-sm text-gray-400">
        フォローしているユーザーのレビューを表示しています。
      </p>
      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            読み込み中...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            フォローしているユーザーの投稿はまだありません。気になるユーザーをフォローしてみましょう。
          </CardContent>
        </Card>
      ) : (
        <NewReviewsCarousel items={items} />
      )}
    </section>
  );
}
