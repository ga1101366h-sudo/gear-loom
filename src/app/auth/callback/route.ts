import { NextResponse } from "next/server";

/** Firebase では OAuth はポップアップで完了するため、このルートは不要です。誤ってアクセスされた場合はログインへリダイレクトします。 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";
  return NextResponse.redirect(`${origin}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}
