import { ImageResponse } from "next/og";
import { getReviewByIdFromFirestore } from "@/lib/firebase/data";
import { getFirebaseStorageUrl } from "@/lib/utils";

export const alt = "Gear-Loom レビュー";
export const size = { width: 1200, height: 675 }; // X推奨 1.78:1
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await getReviewByIdFromFirestore(id);

  if (!review) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a2332",
            color: "#94a3b8",
            fontSize: 24,
          }}
        >
          レビューが見つかりません
        </div>
      ),
      { ...size }
    );
  }

  const images = (review as { review_images?: { storage_path: string; sort_order: number }[] }).review_images ?? [];
  const firstImage = images.length > 0
    ? [...images].sort((a, b) => a.sort_order - b.sort_order)[0]
    : null;
  const imageUrl = firstImage ? getFirebaseStorageUrl(firstImage.storage_path) : null;
  const hasValidImage = imageUrl && imageUrl.startsWith("https://") && !imageUrl.includes("/b//o/");

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
          background: hasValidImage ? "#1a2332" : "linear-gradient(135deg, #1a2332 0%, #0f172a 100%)",
          padding: 40,
        }}
      >
        {hasValidImage && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
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
        )}
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
              textShadow: hasValidImage ? "0 2px 8px rgba(0,0,0,0.8)" : "none",
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
}
