import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  decodeCategorySlug,
  isKnownCategorySlug,
  toCanonicalCategorySlug,
} from "@/data/post-categories";
import { isHiddenReviewId } from "@/data/hidden-reviews";

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
const REVIEW_PREFIX = "/reviews/";

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

    // ★同じカテゴリの2系統URLを1本に寄せる（2026-08-08 第2弾A）
    //   日本語式 `/category/ベース__ベースエフェクター__オーバードライブ` を
    //   ローマ字式 `/category/bass-effector__overdrive` へ 308 で恒久リダイレクトする。
    //   ★404 ではなく 308 を選んだ理由：
    //     日本語式URLは **中身のある実在ページ**で、レビュー詳細から内部リンクされており、
    //     canonical が自分自身を指していたため Google に既に登録され得ている。
    //     404 にすると、そのURLが積み上げた評価をそのまま捨てることになる。
    //     一方、第1弾で 404 にしたのは「空白違いなど、どこからもリンクされていない
    //     無限に作れる異表記」＝捨てても失うものが無いURLで、性質が違う。
    //   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_本番_視覚チェック.md
    const decodedSlug = decodeCategorySlug(rawSlug);
    const canonicalSlug = toCanonicalCategorySlug(decodedSlug);
    if (canonicalSlug && canonicalSlug !== decodedSlug) {
      const url = request.nextUrl.clone();
      url.pathname = `${CATEGORY_PREFIX}${canonicalSlug}`;
      // ?parent= などのクエリはそのまま引き継ぐ（絞り込み条件を失わせない）
      return NextResponse.redirect(url, 308);
    }
  }

  // ★非公開にした記事は HTTP 404 を返す（2026-08-08）
  //   getReviewByIdFromFirestore が null を返すのでページは 404 の見た目になるが、
  //   **ステータスは 200 のまま**になる（カテゴリと同じ src/app/loading.tsx が原因のソフト404）。
  //   200 のまま返すと、Google からは「中身が404の200ページ」に見えてURLが残り続けるため、
  //   ここでレンダリング前に確実に 404 を返す。
  //   対象と理由は src/data/hidden-reviews.ts を参照。
  //
  //   ★/edit だけは通す（2026-08-09 レビュー差し戻し 🔴-1 の是正）
  //     今回の方式は「削除ではなく非公開。実データは無傷でいつでも戻せる」ことが設計の中心。
  //     ところが当初の実装は `/reviews/<id>` の直後の1区画だけを見ていたため、
  //     **後ろに何が付いていても同じ判定**になり、`/reviews/<非公開ID>/edit` まで 404 になっていた
  //     （コメントには「素通り」と書いてあったが実測は 404 ＝ コメントと実装が逆だった）。
  //     編集画面が開けないと、本人が中身を書き換えて公開し直すのに
  //     「先に hidden-reviews.ts から ID を消してデプロイし直す」しかなくなり、可逆性が1段階遠くなる。
  //     出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第2弾A_レビュー.md 🔴-1
  //
  //   ★なぜ「/edit だけ」で、`rest.length === 1`（＝ちょうど /reviews/<id> のときだけ404）にしないか：
  //     `/reviews/[id]/` の配下に実在するルートは `edit/` と `opengraph-image.tsx` の2つだけ（実測）。
  //     `rest.length === 1` にすると `/reviews/<非公開ID>/opengraph-image` が 200 を返すようになる。
  //     中身は情報の出ない汎用フォールバック画像だが、**非公開化の目的は「検索結果からも消す」**なので、
  //     200 を返す URL を増やさない側に倒した。編集導線（可逆性）に必要なのは `/edit` だけ。
  //
  //   なお `/reviews`（一覧）・`/reviews/new`・`/reviews/compare` は、
  //   1区画目が非公開IDでないため、この分岐に入らず元から素通りする。
  if (pathname.startsWith(REVIEW_PREFIX)) {
    // 「/reviews/<id>/<残り...>」に分解する
    const rest = pathname.slice(REVIEW_PREFIX.length).split("/");
    const reviewId = rest[0];
    const isEditPath = rest[1] === "edit";
    if (reviewId && !isEditPath && isHiddenReviewId(reviewId)) {
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
  matcher: ["/category/:path*", "/reviews/:path*"],
};
