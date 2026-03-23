import { NextRequest, NextResponse } from "next/server";

/** SSRF 対策: Firebase Storage の配信ホストのみ許可 */
const ALLOWED_HOSTS = new Set(["firebasestorage.googleapis.com"]);

const MAX_URL_LENGTH = 4096;
const FETCH_TIMEOUT_MS = 20000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw || raw.length > MAX_URL_LENGTH) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (target.protocol !== "https:") {
    return new NextResponse("Only https is allowed", { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "Gear-Loom-OG-Proxy/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return new NextResponse("Bad Gateway", { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() ??
      "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 502 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return new NextResponse("Payload Too Large", { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    clearTimeout(timeout);
    return new NextResponse("Bad Gateway", { status: 502 });
  }
}
