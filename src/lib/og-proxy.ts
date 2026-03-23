/**
 * X（Twitter）等のクローラーが Firebase Storage のクエリ付きURLで失敗する場合があるため、
 * 同一オリジンの `/api/og-proxy` 経由で配信する。
 */

const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";

export function isFirebaseStorageHttpsUrl(url: string): boolean {
  const u = (url ?? "").trim();
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" && parsed.hostname === FIREBASE_STORAGE_HOST;
  } catch {
    return false;
  }
}

/** Firebase Storage の実画像URLのときだけプロキシURLに変換。それ以外はそのまま。 */
export function toOgProxyImageUrl(siteOrigin: string, imageUrl: string): string {
  const origin = siteOrigin.replace(/\/$/, "");
  if (!isFirebaseStorageHttpsUrl(imageUrl)) return imageUrl;
  return `${origin}/api/og-proxy?url=${encodeURIComponent(imageUrl)}`;
}
