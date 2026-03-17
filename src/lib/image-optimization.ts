export function shouldUnoptimizeImage(src: string): boolean {
  const s = (src ?? "").trim();
  if (!s) return false;
  // Next.js の画像最適化が使えない/向かないものだけ unoptimized にする
  // - data: (Base64 等)
  // - blob: (フォームプレビュー等の一時URL)
  // - ローカルパス（/images/... など）※環境により最適化対象外のことがあるため従来の挙動を維持
  return s.startsWith("data:") || s.startsWith("blob:") || s.startsWith("/");
}

