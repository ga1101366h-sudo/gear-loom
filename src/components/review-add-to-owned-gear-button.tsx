"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  /** レビューに紐づく機材名（必須。ない場合は追加不可） */
  gearName: string | null | undefined;
  /** カテゴリ表示名（例: ベースエフェクター）。省略時は「その他」 */
  categoryNameJa?: string | null;
  /** メーカー名。省略可 */
  makerName?: string | null;
  className?: string;
};

/** レビュー詳細のアクションバー用。「持ってる（所有機材に追加）」→ Prisma UserGear に登録。 */
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
    const category = (categoryNameJa ?? "").trim() || "その他";
    const manufacturer = (makerName ?? "").trim() || undefined;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      if (!token) {
        window.alert("認証の有効期限が切れています。再ログインしてください。");
        return;
      }
      const res = await fetch("/api/user/gears", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, category, manufacturer: manufacturer || null }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        window.alert(data?.error ?? "所有機材の追加に失敗しました。");
        return;
      }
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
