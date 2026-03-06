"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { GitCompare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

interface ReviewCompareButtonProps {
  reviewId: string;
  className?: string;
}

export function ReviewCompareButton({ reviewId, className }: ReviewCompareButtonProps) {
  const { user } = useAuth();
  const db = getFirebaseFirestore();
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || !db || checked) return;
    (async () => {
      const q = query(
        collection(db, "review_compares"),
        where("review_id", "==", reviewId),
        where("user_id", "==", user.uid),
      );
      const snap = await getDocs(q);
      setInList(!snap.empty);
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
      if (inList) {
        const q = query(
          collection(db, "review_compares"),
          where("review_id", "==", reviewId),
          where("user_id", "==", user.uid),
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "review_compares", d.id));
        }
        setInList(false);
      } else {
        await addDoc(collection(db, "review_compares"), {
          review_id: reviewId,
          user_id: user.uid,
          created_at: new Date().toISOString(),
        });
        setInList(true);
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
      className={`h-10 flex items-center justify-center gap-1.5 rounded-md whitespace-nowrap px-2 text-xs font-medium ${className ?? ""}`}
    >
      <GitCompare
        className={`h-4 w-4 shrink-0 ${inList ? "text-electric-blue" : "text-gray-400"}`}
        aria-hidden
      />
      <span className="sm:hidden">比較リスト</span>
      <span className="hidden sm:inline">{inList ? "比較リストに追加済み" : "比較リストに追加"}</span>
    </Button>
  );
}

