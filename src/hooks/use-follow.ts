"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";

function followDocId(followerUid: string, followingUid: string): string {
  return `${followerUid}_${followingUid}`;
}

export function useFollow(targetProfileUid: string | null) {
  const { user } = useAuth();
  const db = getFirebaseFirestore();
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    if (!db || !user || !targetProfileUid || targetProfileUid === user.uid) {
      setLoading(false);
      setIsFollowing(false);
      return;
    }
    const docId = followDocId(user.uid, targetProfileUid);
    getDoc(doc(db, "follows", docId))
      .then((snap) => setIsFollowing(snap.exists()))
      .catch(() => setIsFollowing(false))
      .finally(() => setLoading(false));
  }, [db, user?.uid, targetProfileUid]);

  const toggle = useCallback(async () => {
    if (!db || !user || !targetProfileUid || targetProfileUid === user.uid || toggleLoading) return;
    const myUid = user.uid;
    const docId = followDocId(myUid, targetProfileUid);
    const docRef = doc(db, "follows", docId);
    setToggleLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(docRef);
        setIsFollowing(false);
      } else {
        await setDoc(docRef, {
          follower_id: myUid,
          following_id: targetProfileUid,
          created_at: new Date().toISOString(),
        });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("follow toggle failed", err);
    } finally {
      setToggleLoading(false);
    }
  }, [db, user, targetProfileUid, isFollowing, toggleLoading]);

  return {
    isFollowing,
    toggle,
    loading,
    toggleLoading,
    canFollow: !!db && !!user && !!targetProfileUid && targetProfileUid !== user.uid,
  };
}
