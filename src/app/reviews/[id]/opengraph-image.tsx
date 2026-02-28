import { ImageResponse } from "next/og";
import { getReviewByIdFromFirestore } from "@/lib/firebase/data";

export const alt = "Gear-Loom レビュー";
export const size = { width: 1200, height: 630 };
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

  const title = review.title.length > 60 ? review.title.slice(0, 57) + "…" : review.title;
  const subtitle = review.gear_name ? `${review.gear_name} | Gear-Loom` : "Gear-Loom";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a2332 0%, #0f172a 100%)",
          padding: 48,
        }}
      >
        <div
          style={{
            color: "#7dd3fc",
            fontSize: 18,
            marginBottom: 12,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            color: "#f1f5f9",
            fontSize: 42,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 1000,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#64748b",
            fontSize: 20,
            marginTop: 24,
          }}
        >
          楽器・機材レビュー | gear-loom.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
