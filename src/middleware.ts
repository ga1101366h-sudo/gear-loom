import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isKnownCategorySlug } from "@/data/post-categories";

/**
 * ★このファイルの場所について（2026-08-08）
 *  このリポジトリは src ディレクトリ構成なので、Next.js が読むのは `src/middleware.ts`。
 *  リポジトリ直下の `middleware.ts` は**ビルドに取り込まれていない**（.next/server/middleware-manifest.json の
 *  "middleware" が {} になることで実測確認済み）。直下のファイルの内容もここに引き継いである。
 */

/** 未認証でもアクセス可能なパス（公開プロフィールなど）。ここに含まれると認証チェックでログアウトされない。 */
const publicRoutes = [
  "/users",   // 公開プロフィール /users/[userId] および配下すべて
  "/profile", // プロフィール /profile および /profile/[id] 等
];

function isPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  return publicRoutes.some((base) => path === base || path.startsWith(`${base}/`));
}

const CATEGORY_PREFIX = "/category/";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ルートでは認証チェック・リダイレクトを行わずそのまま通過
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ★実在しないカテゴリのURLは HTTP 404 を返す（2026-08-08）
  //   症状：ページ側の notFound() だけでは HTTPステータスが 200 のままになり、
  //         「404の見た目 ＋ noindex メタ ＋ ステータス200」＝ソフト404になる。
  //   ★真因：Next.js 一般のストリーミング仕様ではなく、このリポジトリに
  //     `src/app/loading.tsx` があること。ルート直下の loading.tsx はルート直下に Suspense 境界を
  //     作るため、シェルが先に送出されて notFound() がステータスに反映されなくなる。
  //     （レビュアー役が Next.js 15.1.9 の最小再現アプリで loading.tsx の有無だけを変える
  //       A/B を行い、あり=200／なし=404 を実測。出典：
  //       C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②B）
  //   ★それでも middleware 方式を採る理由（2026-08-08 CEO判断）：
  //     loading.tsx を外せば全ルートのソフト404が一度に直るが、ページ遷移時のスケルトン表示という
  //     別の目的があり、外すと体感速度（UX）が変わって他ルートにも影響する。ここでは UX を優先して
  //     loading.tsx を残し、middleware でレンダリング前に確実に 404 を返す方式を維持する。
  //   これが無いと /category/<任意の文字列> がすべて 200 を返す無限のURL空間になる（2026-08-08 調査・レビューE）。
  if (pathname.startsWith(CATEGORY_PREFIX)) {
    const rawSlug = pathname.slice(CATEGORY_PREFIX.length).split("/")[0];
    if (!rawSlug || !isKnownCategorySlug(rawSlug)) {
      return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    }
  }

  return NextResponse.next();
}

/**
 * ★middleware を走らせる範囲（2026-08-08 差し戻し対応・レビュー指摘A）
 *
 *  これが無いと **すべてのリクエスト**（`/_next/static/*` のJS・CSSチャンク、`/favicon.ico` などの
 *  静的アセットを含む）で Edge 関数が起動する。Vercel は middleware の呼び出し回数が課金対象で、
 *  1ページ表示あたり静的チャンクだけで数十リクエストあるため、必要な呼び出し（/category/*）の
 *  数十倍を毎回払うことになる。加えて全リクエストに Edge 関数のコールドスタートが乗る。
 *  出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②A
 *
 *  ★次にこのファイルを触る人へ（申し送り）：
 *   上の isPublicPath（/users・/profile の分岐）は現状 if に入っても入らなくても
 *   NextResponse.next() を返す完全な no-op なので、範囲を /category/* に絞っても挙動は変わらない。
 *   **ただし将来ここに認証処理を足すなら、この matcher を広げないと1行も実行されない。**
 */
export const config = {
  matcher: ["/category/:path*"],
};
