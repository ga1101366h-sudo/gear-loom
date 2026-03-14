import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
/** Avoid prerender on Windows where @vercel/og can throw Invalid URL (fileURLToPath) */
export const dynamic = "force-dynamic";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D1117",
          borderRadius: 36,
          border: "4px solid rgba(0, 212, 255, 0.5)",
          boxShadow: "0 0 60px rgba(0, 212, 255, 0.2)",
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 800,
            color: "#00D4FF",
            fontFamily: "system-ui, sans-serif",
            textShadow: "0 0 40px rgba(0, 212, 255, 0.5)",
            letterSpacing: "-0.02em",
          }}
        >
          G
        </span>
      </div>
    ),
    { ...size }
  );
}
