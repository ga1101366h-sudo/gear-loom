import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** 未認証でもアクセス可能なパス（公開プロフィールなど）。ここに含まれると認証チェックでログアウトされない。 */
const publicRoutes = [
  "/users",   // 公開プロフィール /users/[userId] および配下すべて
  "/profile", // プロフィール /profile および /profile/[id] 等
];

function isPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  return publicRoutes.some((base) => path === base || path.startsWith(`${base}/`));
}

export function middleware(request: NextRequest) {
  // 公開ルートでは認証チェック・リダイレクトを行わずそのまま通過
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return NextResponse.next();
}
