export function shouldUnoptimizeImage(src: string): boolean {
  const s = (src ?? "").trim();
  if (!s) return false;
  // Next.js の画像最適化が使えない/向かないものだけ unoptimized にする
  // - data: (Base64 等)
  // - blob: (フォームプレビュー等の一時URL)
  // - ローカルパス（/images/... など）※環境により最適化対象外のことがあるため従来の挙動を維持
  return s.startsWith("data:") || s.startsWith("blob:") || s.startsWith("/");
}

/**
 * トップのボードカルーセル等、Firebase Storage を `/_next/image` 経由にすると
 * 初回フルロード時だけ取りこぼすケースがあるため、同ドメイン直リンクにする。
 * （一覧・サムネイル用途。記事本文の next/image 最適化方針とは別扱い）
 */
export function shouldUnoptimizeFirebaseStorage(src: string): boolean {
  const s = (src ?? "").trim();
  if (!s) return false;
  if (shouldUnoptimizeImage(s)) return true;
  return s.includes("firebasestorage.googleapis.com");
}

