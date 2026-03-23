import { getFirebaseStorageUrl } from "@/lib/utils";

/** 本文（Markdown / HTML）から最初の画像URLを抽出 */
export function extractFirstImageFromBody(
  bodyMd: string | null | undefined,
  bodyHtml: string | null | undefined
): string | null {
  const md = (bodyMd ?? "").trim();
  if (md) {
    const mdMatch = md.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
    if (mdMatch?.[1]) return mdMatch[1].trim();
  }
  const html = (bodyHtml ?? "").trim();
  if (html) {
    const htmlMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (htmlMatch?.[1]) return htmlMatch[1].trim();
  }
  return null;
}

export function resolveReviewImageUrl(image: {
  storage_path?: string | null;
  url?: string | null;
}): string | null {
  const storagePath = (image.storage_path ?? "").trim();
  if (storagePath) return getFirebaseStorageUrl(storagePath);
  const directUrl = (image.url ?? "").trim();
  if (directUrl.startsWith("http://") || directUrl.startsWith("https://")) return directUrl;
  return null;
}

/**
 * X / Facebook が確実に取得できるよう、レビューの「代表画像」URLを1つ返す。
 * - review_images（storage_path / url）
 * - なければ本文内の最初の画像
 */
export function getReviewPrimaryImageUrl(review: {
  review_images?: { storage_path?: string | null; url?: string | null; sort_order?: number }[];
  body_md?: string | null;
  body_html?: string | null;
}): string | null {
  const images = review.review_images ?? [];
  const firstImage = images.length
    ? [...images].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))[0]
    : null;
  const bodyImageUrl = extractFirstImageFromBody(review.body_md, review.body_html);
  if (firstImage) {
    const fromGallery = resolveReviewImageUrl(firstImage)?.trim();
    if (fromGallery) return fromGallery;
  }
  return bodyImageUrl?.trim() || null;
}
