/**
 * 楽天API等から取得した「未登録機材」を仮レビュー画面へ渡すための型とストレージキー
 * クリック時はDBに保存せず、レビュー投稿（Submit）時に gears + reviews を同時保存する
 */

export const PENDING_GEAR_STORAGE_KEY = "pendingGearFromApi";

export type PendingGearFromApi = {
  name: string;
  imageUrl: string;
  affiliateUrl: string;
  /** カテゴリページから遷移した場合のスラッグ（プリセット用） */
  categorySlug?: string;
  categoryNameJa?: string;
};

export function getPendingGear(): PendingGearFromApi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_GEAR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof (parsed as PendingGearFromApi).name === "string"
    ) {
      const p = parsed as PendingGearFromApi;
      return {
        name: p.name,
        imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : "",
        affiliateUrl: typeof p.affiliateUrl === "string" ? p.affiliateUrl : "",
        categorySlug: typeof p.categorySlug === "string" ? p.categorySlug : undefined,
        categoryNameJa: typeof p.categoryNameJa === "string" ? p.categoryNameJa : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setPendingGear(gear: PendingGearFromApi): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_GEAR_STORAGE_KEY, JSON.stringify(gear));
}

export function clearPendingGear(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_GEAR_STORAGE_KEY);
}
