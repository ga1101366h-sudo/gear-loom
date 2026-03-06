"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

interface ReviewLikeButtonProps {
  reviewId: string;
  initialCount: number;
  initialLiked: boolean;
}

export function ReviewLikeButton({
  reviewId,
  initialCount,
  initialLiked,
  className,
}: ReviewLikeButtonProps & { className?: string }) {
  const { user } = useAuth();
  const db = getFirebaseFirestore();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || !db || checked) return;
    (async () => {
      const q = query(
        collection(db, "review_likes"),
        where("review_id", "==", reviewId),
        where("user_id", "==", user.uid)
      );
      const snap = await getDocs(q);
      setLiked(!snap.empty);
      setChecked(true);
    })();
  }, [user, db, reviewId, checked]);

  async function handleToggle() {
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (!db) return;
    setLoading(true);
    try {
      if (liked) {
        const q = query(
          collection(db, "review_likes"),
          where("review_id", "==", reviewId),
          where("user_id", "==", user.uid)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "review_likes", d.id));
        }
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await addDoc(collection(db, "review_likes"), {
          review_id: reviewId,
          user_id: user.uid,
          created_at: new Date().toISOString(),
        });
        setLiked(true);
        setCount((c) => c + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`gap-2 bg-transparent text-xs font-medium ${className ?? ""}`}
    >
      <Heart
        className={`h-4 w-4 shrink-0 ${liked ? "fill-electric-blue text-electric-blue" : "text-gray-400"}`}
        aria-hidden
      />
      <span className="tabular-nums">{count}</span>
      <span className="sr-only">{liked ? "いいねを解除" : "いいねする"}</span>
    </Button>
  );
}
