import { ImageResponse } from "next/og";
import { headers } from "next/headers";

export const runtime = "edge";
export const alt = "Gear-Loom Board";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  try {
    const h = await headers();
    const host = h.get("host") || h.get("x-forwarded-host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host) baseUrl = `${proto === "https" ? "https" : "http"}://${host}`;
  } catch {
    // Edge で headers が取れない場合は env のまま
  }

  let actualUrl: string | null = null;
  let thumbUrl: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/og-data/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      actualUrl = data.actualPhotoUrl
        ? toAbsoluteUrl(data.actualPhotoUrl, baseUrl)
        : null;
      thumbUrl = data.thumbnail
        ? toAbsoluteUrl(data.thumbnail, baseUrl)
        : null;
    }
  } catch (error) {
    console.error("Fetch error in Edge:", error);
  }

  // Satori が解釈できる TTF を取得（GitHub raw は HTML を返すことがあるため Google Fonts の raw を使用）
  const fontRes = await fetch(
    "https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf",
    { cache: "no-store" }
  );
  const fontData = fontRes.ok ? await fontRes.arrayBuffer() : null;
  const fonts = fontData
    ? [{ name: "Roboto", data: fontData, style: "normal" as const }]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: "#0a0a0a",
          color: "white",
          fontFamily: "Roboto",
        }}
      >
        {/* 画像エリア (左右分割・全体表示) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "1200px",
            height: "530px",
            backgroundColor: "#111",
          }}
        >
          {actualUrl && thumbUrl ? (
            <>
              {/* 実機写真: 左半分 (600x530) */}
              <div
                style={{
                  display: "flex",
                  width: "600px",
                  height: "530px",
                  borderRight: "2px solid #333",
                }}
              >
                <img
                  src={actualUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              {/* 配線図: 右半分 (600x530) */}
              <div
                style={{
                  display: "flex",
                  width: "600px",
                  height: "530px",
                }}
              >
                <img
                  src={thumbUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            </>
          ) : actualUrl ? (
            <div
              style={{
                display: "flex",
                width: "1200px",
                height: "530px",
              }}
            >
              <img
                src={actualUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : thumbUrl ? (
            <div
              style={{
                display: "flex",
                width: "1200px",
                height: "530px",
              }}
            >
              <img
                src={thumbUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1200px",
                height: "530px",
              }}
            >
              <span style={{ fontSize: "32px", color: "#666" }}>No Image</span>
            </div>
          )}
        </div>

        {/* 下部の黒帯エリア (高さ 100px 固定) */}
        <div
          style={{
            display: "flex",
            width: "1200px",
            height: "100px",
            backgroundColor: "#000",
            alignItems: "center",
            padding: "0 40px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "40px",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            Gear-Loom Board
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              color: "#06b6d4",
            }}
          >
            gear-loom.com
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts && { fonts }) }
  );
}
