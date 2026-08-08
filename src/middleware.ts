import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  decodeCategorySlug,
  isKnownCategorySlug,
  toCanonicalCategorySlug,
} from "@/data/post-categories";

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
  //
  //   ★このファイルに残っているのは、この 308 リダイレクトだけ（2026-08-09 第3弾A）。
  //     以前ここにあった「実在しないカテゴリを 404 にする」「非公開レビューを 404 にする」の
  //     2つの回避策は**撤去した**。理由＝ソフト404の真因だった `src/app/loading.tsx` を
  //     削除したことで、ページ側の `notFound()` がそのまま HTTP 404 になったため
  //     （middleware で肩代わりする必要が無くなった）。
  //     判定そのものは失っていない：カテゴリの厳密判定は
  //     `src/app/category/[slug]/page.tsx` が `isKnownCategorySlug()` を直接呼ぶ形に移してある。
  //     出典：C:\AI組織運営\.company\engineering\notes\2026-08-09_GearLoom_SEO修正_第3弾A実装.md
  if (pathname.startsWith(CATEGORY_PREFIX)) {
    const rawSlug = pathname.slice(CATEGORY_PREFIX.length).split("/")[0];
    // ★ここで isKnownCategorySlug を通す理由（2026-08-09 第3弾A・実測で踏んだ穴）
    //   toCanonicalCategorySlug() は入力を trim してから照合するため、
    //   `/category/ギター ` のような**第1弾で404にすると決めた異表記**にも正規形を返す。
    //   ガード無しでこのブロックに入れると 404 のはずのURLが `/category/ギター` へ 308 して
    //   200 に化けてしまう（実測：異表記33件中30件が404→308に変わった）。
    //   ＝ 第1弾 指摘E「無限に作れる異表記URLを閉じる」の打ち消し。
    //   正規形だけをリダイレクトの対象にし、それ以外はページ側の notFound() に任せる。
    if (rawSlug && isKnownCategorySlug(rawSlug)) {
      const decodedSlug = decodeCategorySlug(rawSlug);
      const canonicalSlug = toCanonicalCategorySlug(decodedSlug);
      if (canonicalSlug && canonicalSlug !== decodedSlug) {
        const url = request.nextUrl.clone();
        url.pathname = `${CATEGORY_PREFIX}${canonicalSlug}`;
        // ?parent= などのクエリはそのまま引き継ぐ（絞り込み条件を失わせない）
        return NextResponse.redirect(url, 308);
      }
    }
  }

  return NextResponse.next();
}

/**
 * ★middleware を走らせる範囲（2026-08-08 レビュー指摘A ／ 2026-08-09 第3弾Aで最小化）
 *
 *  これが無いと **すべてのリクエスト**（`/_next/static/*` のJS・CSSチャンク、`/favicon.ico` などの
 *  静的アセットを含む）で Edge 関数が起動する。Vercel は middleware の呼び出し回数が課金対象で、
 *  1ページ表示あたり静的チャンクだけで数十リクエストあるため、必要な呼び出しの
 *  数十倍を毎回払うことになる。加えて全リクエストに Edge 関数のコールドスタートが乗る。
 *  出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②A
 *
 *  ★現在この middleware に残っている仕事は「カテゴリURLの 308 正規化」だけなので、
 *   範囲は `/category/*` のみでよい。`/reviews/:path*` は第2弾Aで足したが、
 *   第3弾Aで役目が無くなったため外した（`/reviews` 一覧の表示1回につき Edge に載っていた
 *   リクエストが 0 になる）。
 *
 *  ★次にこのファイルを触る人へ（申し送り）：
 *   上の isPublicPath（/users・/profile の分岐）は、現在の matcher では**そもそも到達しない**
 *   （/users・/profile は matcher に含まれていない）。将来ここに認証処理を足すなら、
 *   **この matcher を広げないと1行も実行されない。**
 */
export const config = {
  matcher: ["/category/:path*"],
};
