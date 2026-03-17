"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

export interface BoardLikeButtonProps {
  postId: string;
  title: string;
  thumbnailUrl: string | null;
  className?: string;
}

/**
 * エフェクターボード投稿のいいねボタン。
 * Firestore の board_likes で登録/解除し、マイページ表示用に title / thumbnail_url を保存する。
 */
export function BoardLikeButton({
  postId,
  title,
  thumbnailUrl,
  className,
}: BoardLikeButtonProps) {
  const { user } = useAuth();
  const db = getFirebaseFirestore();
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!db) return;
    (async () => {
      const myLikeQ =
        user && db
          ? query(
              collection(db, "board_likes"),
              where("post_id", "==", postId),
              where("user_id", "==", user.uid)
            )
          : null;
      const countQ = query(
        collection(db, "board_likes"),
        where("post_id", "==", postId)
      );
      const [mySnap, countSnap] = await Promise.all([
        myLikeQ ? getDocs(myLikeQ) : Promise.resolve(null),
        getDocs(countQ),
      ]);
      if (mySnap && !mySnap.empty) setLiked(true);
      setCount(countSnap.size);
      setChecked(true);
    })();
  }, [db, user?.uid, postId]);

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
          collection(db, "board_likes"),
          where("post_id", "==", postId),
          where("user_id", "==", user.uid)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "board_likes", d.id));
        }
        setLiked(false);
        setCount((c) => (c != null ? Math.max(0, c - 1) : 0));
      } else {
        await addDoc(collection(db, "board_likes"), {
          post_id: postId,
          user_id: user.uid,
          title: title || "エフェクターボード",
          thumbnail_url: thumbnailUrl ?? null,
          created_at: new Date().toISOString(),
        });
        setLiked(true);
        setCount((c) => (c != null ? c + 1 : 1));
      }
    } finally {
      setLoading(false);
    }
  }

  const displayCount = count ?? 0;

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`h-10 w-full flex items-center justify-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-white/10 ${
        liked ? "border-cyan-500/50 text-cyan-400" : "text-gray-400"
      } ${className ?? ""}`}
      aria-label={liked ? "いいねを解除" : "いいねする"}
    >
      <Heart
        className={`h-3.5 w-3.5 shrink-0 ${liked ? "fill-cyan-400 text-cyan-400" : ""}`}
        aria-hidden
      />
      <span>いいね</span>
      <span className="tabular-nums">{displayCount}</span>
    </Button>
  );
}
