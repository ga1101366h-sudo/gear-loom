/**
 * 非公開にする記事（Firestore `reviews` のドキュメントID）。
 *
 * ★この仕組みが必要な理由（2026-08-08 調査で判明）
 *   Firestore の `reviews` ドキュメントには「非公開」を表すフィールドが存在しない
 *   （`is_public` / `status` / `visibility` / `published` のいずれも無い＝全フィールドをダンプして確認）。
 *   そのためアプリには「非公開にする」機能そのものが無く、UIから選べるのは
 *   「記事を削除」＝**取り消せない操作**だけだった。
 *   ここに ID を書くと、実データを一切変更せずに公開面から外せる。**行を消せば元に戻る。**
 *
 * ★適用箇所（次にこのファイルを触る人へ・2026-08-09 更新）
 *   ここに ID を足すときは、**必ず `isHiddenReviewId` を `src` 全体で grep して全数を確認すること**。
 *   件数はこのコメントに書かない（増えたときに必ず古くなり、次の人を誤らせるため）。
 *   あわせて **`reviews` コレクションへのアクセス自体**も grep すること。
 *   `collection("reviews")` というリテラルだけを grep すると、
 *   `database.collection(collectionName)` のような**変数経由の呼び出しが構造的に載らない**。
 *
 *   ★この注意書きの由来（2026-08-08〜09 に実際に2回踏んだ穴）
 *     (1) 初版のこのコメントは「適用箇所は3つ」と書いてあったが、実際の公開読み取り経路は
 *         それより多く、3箇所だけ塞いだ結果 **トップページに記事が残り、詳細ページも 200 のまま**だった。
 *         漏れていたのは 人気記事・公開プロフィール/埋め込み・評価集計・フォロー系。
 *     (2) さらに `collection("reviews")` のリテラル grep では拾えない
 *         `getAboutPageCountsFromFirestore()` の集計クエリが残り、
 *         「/about だけ件数が減らない」状態になっていた（★ここが2つ目の漏れ）。
 *     出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第2弾A_レビュー.md 🔴-2 / 🔴-3
 *
 *   現在の適用箇所（2026-08-09 時点。grep で必ず現物を確認すること）
 *     - `src/lib/firebase/data.ts`
 *         `getReviewsFromFirestore()`             … トップ新着・レビュー一覧・カテゴリ・/blog・/events・/photos
 *         `getReviewsByAuthorIdFromFirestore()`   … 公開プロフィール /users/[userId]・/embed/users/[userId]
 *         `getReviewByIdFromFirestore()`          … 記事の詳細ページ・OGP画像（直リンクで開かれても表示しない）
 *         `getGearRatingAggregateFromFirestore()` … 機材ページの評価集計（構造化データ AggregateRating）
 *         `getPopularReviewsFromFirestore()`      … トップの人気記事
 *         `getReviewsFromFollowedUsersFromFirestore()` … ログイン後のフォロー中タイムライン（サーバ側）
 *         `getFollowingTimelineFromFirestore()`   … 同上
 *         `getAboutPageCountsFromFirestore()`     … /about の件数。**集計クエリ（count）なので docs を絞れず**、
 *                                                   実在する非公開記事の件数を引く方式にしてある。
 *                                                   `/api/about/stats`（公開API）も同じ関数を通る。
 *     - `src/app/sitemap.ts`  … sitemap.xml への掲載と「レビューがあるカテゴリだけ載せる」判定の母集団
 *     - `src/app/reviews/[id]/opengraph-image.tsx` … OGP画像URLに HTTP 404 を返す。
 *                               この画像ルートだけは、記事が取れなくても汎用画像で 200 を返す作りなので、
 *                               ここで明示的に落とさないと「200を返すURL」が1本残ってしまう。
 *
 *   ★2026-08-09（第3弾A）に変わったこと
 *     以前は `src/middleware.ts` が `/reviews/<非公開ID>` に HTTP 404 を返していた。
 *     これは「ページ側の notFound() だけではステータスが 200 のままになる」ソフト404への回避策で、
 *     真因（ルート直下の `src/app/loading.tsx`）を第3弾Aで取り除いたため**不要になり撤去した**。
 *     現在は `getReviewByIdFromFirestore()` が null を返す → ページの `notFound()` が
 *     そのまま HTTP 404 になる。`/reviews/<id>/edit` が通る（本人が中身を直せる＝可逆性の担保）点も
 *     変わっていない（編集画面は Firestore をクライアント側から読むため）。
 *
 *   ★意図的に除外を入れていない箇所（＝漏れではない）
 *     - `src/lib/firebase/follow-timeline-client.ts` … クライアント側のフォロー中タイムライン。
 *       サーバ側の同等関数2つには除外が入っているが、ここだけ入っていない【未対応・第3弾送り】。
 *     - `src/app/mypage/*` … 本人の管理画面。自分の記事を自分の管理画面で見るのは非公開化の趣旨に反しない。
 *     - `src/lib/firebase/admin.ts` / `src/app/api/admin/*` / `src/app/api/reviews/*` /
 *       `src/app/api/me/*` / `src/lib/gears/link-gear.ts` / `src/app/reviews/new/page.tsx`
 *       … 管理・投稿・更新用の経路。**読み取って表示する公開面ではない**ので除外の対象外。
 *
 * ★将来の正しい形【提案】
 *   本来は `reviews` ドキュメント側に `is_public` を持たせ、取得時に絞るのが素直。
 *   ただし今回は対象が1件で、実データを触らない可逆な方法が求められたため定数リストにしている。
 *   投稿機能を触るタイミングでフィールド化を検討する。
 */

/** 非公開にする記事のIDと、その理由・判断日・判断者 */
export const HIDDEN_REVIEW_IDS: Record<string, string> = {
  // イベントページの唯一の記事。「(サンプル記事)【LIVE告知】[開催日：例 2026/5/15(金)] …」という
  // カギカッコの穴が埋まっていない未記入テンプレートのまま公開され、sitemap にも載っていた。
  // 初見の人がヘッダーの「イベント」を押すと、これ1件しか出てこない状態だった。
  // 出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_本番_視覚チェック.md 🟡-2
  // 判断：2026-08-08 翔貴さん「非公開にする」（削除ではない）。実装は 2026-08-08 第2弾A。
  l4HmAhKMEuQrOH82sLjT: "未記入テンプレートのサンプル記事のため非公開（2026-08-08 翔貴さん判断）",
};

/** 非公開にする記事かどうか */
export function isHiddenReviewId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(HIDDEN_REVIEW_IDS, (id || "").trim());
}
