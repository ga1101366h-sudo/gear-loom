"use client";

import { useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";

type Props = {
  /** レビューに紐づく機材名（必須。ない場合は追加不可） */
  gearName: string | null | undefined;
  /** カテゴリ表示名（例: ベースエフェクター）。省略時は「その他」 */
  categoryNameJa?: string | null;
  /** メーカー名。省略可 */
  makerName?: string | null;
  className?: string;
};

/** レビュー詳細のアクションバー用。「持ってる（所有機材に追加）」→ プロフィールの owned_gear に追記。 */
export function ReviewAddToOwnedGearButton({
  gearName,
  categoryNameJa,
  makerName,
  className = "",
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (typeof window === "undefined") return;
    if (!user) {
      window.alert("この機材を所有機材に追加するにはログインしてください。");
      return;
    }
    const name = (gearName ?? "").trim();
    if (!name) {
      window.alert("このレビューには機材名が登録されていないため、所有機材に追加できません。");
      return;
    }
    const db = getFirebaseFirestore();
    if (!db) {
      window.alert("通信環境を確認してもう一度お試しください。");
      return;
    }
    const categoryLabel = (categoryNameJa ?? "").trim() || "その他";
    const lineCore = (makerName ?? "").trim() ? `${(makerName ?? "").trim()} / ${name}` : name;
    const newLine = `[${categoryLabel}] ${lineCore}`;

    setLoading(true);
    try {
      const profileRef = doc(db, "profiles", user.uid);
      const snap = await getDoc(profileRef);
      const existing = (snap.data()?.owned_gear as string) ?? "";
      const lines = existing.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.some((l) => l === newLine)) {
        window.alert("既に所有機材に追加済みです。");
        return;
      }
      const newText = existing.trim() ? `${existing.trim()}\n${newLine}` : newLine;
      await updateDoc(profileRef, {
        owned_gear: newText.trim() || null,
        updated_at: new Date().toISOString(),
      });
      window.alert("マイページの所有機材に追加しました。");
    } catch (err) {
      console.error(err);
      window.alert("所有機材の追加に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-cyan-500 bg-cyan-500/10 px-2 text-xs font-medium text-cyan-500 whitespace-nowrap transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <PlusCircle className="h-4 w-4 shrink-0" aria-hidden />
      {loading ? (
        <span>追加中…</span>
      ) : (
        <>
          <span>＋ 持ってる</span>
          <span className="hidden sm:inline">（所有機材に追加）</span>
        </>
      )}
    </button>
  );
}
