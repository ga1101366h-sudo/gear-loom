"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

interface ReviewHelpfulButtonProps {
  reviewId: string;
  initialCount: number;
}

export function ReviewHelpfulButton({ reviewId, initialCount, className }: ReviewHelpfulButtonProps & { className?: string }) {
  const { user } = useAuth();
  const db = getFirebaseFirestore();
  const [count, setCount] = useState(initialCount);
  const [marked, setMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || !db || checked) return;
    (async () => {
      const q = query(
        collection(db, "review_helpfuls"),
        where("review_id", "==", reviewId),
        where("user_id", "==", user.uid),
      );
      const snap = await getDocs(q);
      setMarked(!snap.empty);
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
      if (marked) {
        const q = query(
          collection(db, "review_helpfuls"),
          where("review_id", "==", reviewId),
          where("user_id", "==", user.uid),
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "review_helpfuls", d.id));
        }
        setMarked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await addDoc(collection(db, "review_helpfuls"), {
          review_id: reviewId,
          user_id: user.uid,
          created_at: new Date().toISOString(),
        });
        setMarked(true);
        setCount((c) => c + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`gap-1.5 border-electric-blue/50 text-xs ${className ?? ""}`}
    >
      <span className={marked ? "text-electric-blue" : "text-gray-400"}>👍</span>
      <span className="text-gray-200">役に立った</span>
      <span className="text-gray-400 text-[11px]">({count})</span>
    </Button>
  );
}

