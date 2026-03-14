import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Firebase Storage のパスから公開 URL を生成 */
export function getFirebaseStorageUrl(storagePath: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  if (!bucket) return "";
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
}

/**
 * DB に保存された __ 区切りのカテゴリパスをスラッシュ区切りで表示用に整形する。
 * 1階層のみの過去データ（例: ベースエフェクター）にも対応。
 */
export function formatCategoryPath(category?: string | null): string {
  if (category == null || typeof category !== "string") return "";
  return category.trim().split("__").filter(Boolean).join(" / ");
}

/** Firebase Storage のダウンロード URL からストレージパスを取得（削除用） */
export function getStoragePathFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const m = downloadUrl.match(/\/o\/(.+?)(?:\?|$)/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}
