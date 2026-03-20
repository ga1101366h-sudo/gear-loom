import { ImageResponse } from "next/og";
import { getReviewByIdFromFirestore } from "@/lib/firebase/data";
import { getFirebaseStorageUrl } from "@/lib/utils";

export const alt = "Gear-Loom レビュー";
export const size = { width: 1200, height: 675 }; // X推奨 1.78:1
export const contentType = "image/png";

const FETCH_TIMEOUT_MS = 10000; // 高解像度画像でも取り切れるよう余裕を持たせる
const FETCH_MAX_BYTES = 12 * 1024 * 1024; // 12MB

/** レビュー画像がないときのデフォルト背景（常に画像レイヤーがあるようにする） */
const DEFAULT_BG_DATA_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a2332"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><text x="600" y="320" font-family="sans-serif" font-size="32" fill="#475569" text-anchor="middle">Gear-Loom</text></svg>'
  );

/** ArrayBuffer を base64 に（Node / Edge 両対応） */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : "";
}

/** 画像URLを取得して Data URL に変換。失敗時は null */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (!url.startsWith("https://") || url.includes("/b//o/")) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Gear-Loom-OG/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > FETCH_MAX_BYTES) return null;
    const base64 = arrayBufferToBase64(buf);
    if (!base64) return null;
    return `data:${contentType.split(";")[0]};base64,${base64}`;
  } catch {
    return null;
  }
}

/** 本文（Markdown / HTML）から最初の画像URLを抽出 */
function extractFirstImageFromBody(
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

function FallbackCard({ title }: { title?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      {/* エラー時も画像レイヤーを置いて「画像＋タイトル」形式を維持 */}
      <div style={{ position: "absolute", inset: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_BG_DATA_URL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {title && (
          <div
            style={{
              color: "#f1f5f9",
              fontSize: 36,
              fontWeight: 700,
              textAlign: "center",
              maxWidth: 1000,
              lineHeight: 1.3,
              marginBottom: 16,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {title.length > 50 ? title.slice(0, 47) + "…" : title}
          </div>
        )}
        <div style={{ color: "#64748b", fontSize: 20 }}>楽器・機材レビュー | gear-loom.com</div>
      </div>
    </div>
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const review = await getReviewByIdFromFirestore(id);

    if (!review) {
      return new ImageResponse(<FallbackCard />, { ...size });
    }

    const images = (review as { review_images?: { storage_path: string; sort_order: number }[] }).review_images ?? [];
    const firstImage = images.length > 0
      ? [...images].sort((a, b) => a.sort_order - b.sort_order)[0]
      : null;
    const bodyImageUrl = extractFirstImageFromBody(
      (review as { body_md?: string | null }).body_md,
      (review as { body_html?: string | null }).body_html
    );
    const imageUrl = firstImage
      ? getFirebaseStorageUrl(firstImage.storage_path)
      : bodyImageUrl;
    const imageDataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null;
    // Data URL 変換に失敗しても、元URLをそのまま使って描画を試みる
    const bgImageUrl = imageDataUrl ?? imageUrl ?? DEFAULT_BG_DATA_URL;

    const title = review.title.length > 50 ? review.title.slice(0, 47) + "…" : review.title;
    const subtitle = review.gear_name ? `${review.gear_name} | Gear-Loom` : "Gear-Loom";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            background: "#1a2332",
            padding: 40,
          }}
        >
          {/* 常に画像レイヤーを置き、全記事で「画像＋タイトル」のカードになるようにする */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgImageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.4) 50%, transparent 100%)",
              }}
            />
          </div>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ color: "#7dd3fc", fontSize: 18, marginBottom: 8 }}>{subtitle}</div>
            <div
              style={{
                color: "#f1f5f9",
                fontSize: 40,
                fontWeight: 700,
                textAlign: "center",
                maxWidth: 1000,
                lineHeight: 1.3,
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {title}
            </div>
            <div style={{ color: "#64748b", fontSize: 18, marginTop: 16 }}>
              楽器・機材レビュー | gear-loom.com
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch {
    return new ImageResponse(<FallbackCard title="Gear-Loom" />, { ...size });
  }
}
