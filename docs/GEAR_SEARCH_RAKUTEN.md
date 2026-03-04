# 機材検索・楽天API連携 実装手順

## 概要

ユーザーが機材名で検索すると、まず Firestore の `gears` コレクションを検索し、結果が少ない場合に楽天商品検索APIを呼び出して結果を補完する。APIから取得した機材は「この機材のページを作成する」で Firestore に保存し、`/gears/[id]` にリダイレクトする。

## 1. 環境変数

`.env.local` に以下を追加する。

```env
# 楽天API（機材検索で使用）
RAKUTEN_APPLICATION_ID=あなたのアプリID
# 任意：アフィリエイトリンクを返したい場合
RAKUTEN_AFFILIATE_ID=あなたのアフィリエイトID
```

- **RAKUTEN_APPLICATION_ID**: [楽天ウェブサービス](https://webservice.rakuten.co.jp/) でアプリを登録し、アプリIDを取得する。
- **RAKUTEN_AFFILIATE_ID**: 楽天アフィリエイトに登録している場合、IDを指定すると API の `affiliateUrl` が返る。

## 2. 実装済みファイル一覧

| 役割 | パス |
|------|------|
| 型定義（Gear） | `src/types/database.ts` |
| 型定義（楽天API） | `src/types/rakuten.ts` |
| 楽天API呼び出し | `src/lib/rakuten.ts` |
| 機材検索API | `src/app/api/gears/search/route.ts` |
| 機材新規作成API | `src/app/api/gears/route.ts` |
| 機材1件取得API | `src/app/api/gears/[id]/route.ts` |
| 機材取得（サーバー用） | `src/lib/firebase/data.ts` の `getGearByIdFromFirestore` |
| 検索UI | `src/app/gears/search/page.tsx`, `GearSearchClient.tsx` |
| 機材詳細ページ | `src/app/gears/[id]/page.tsx` |
| Firestoreルール | `firestore.rules` の `gears` |
| 画像ドメイン | `next.config.ts` の `images.remotePatterns`（楽天用） |

## 3. フロー

1. ユーザーが `/gears/search` でキーワードを入力して検索。
2. `GET /api/gears/search?q=キーワード` が呼ばれる。
3. サーバーで Firestore の `gears` を `name` の前方一致で検索（最大20件）。
4. 結果が 5 件未満の場合、楽天商品検索API（20170706）を呼び出し、最大10件を取得。
5. 検索結果に「登録済み機材」と「楽天から見つかった機材」の両方を表示。
6. 登録済み機材をクリック → `/gears/[id]` へ遷移。
7. 楽天の機材で「この機材のページを作成する」を押下 → `POST /api/gears` で Firestore に保存 → レスポンスの `id` で `/gears/[id]` へリダイレクト。

## 4. Firestore の `gears` ドキュメント

| フィールド | 型 | 説明 |
|-----------|-----|------|
| name | string | 機材名 |
| imageUrl | string | 画像URL |
| affiliateUrl | string | 購入リンク（楽天など） |
| reviewCount | number | レビュー数（初期値 0） |
| createdAt | timestamp | 作成日時 |

## 5. 注意点・Rate Limit 対策

- **楽天API**: 同一キーワードで 1 分間はメモリキャッシュを返す（`src/lib/rakuten.ts` の `CACHE_TTL_MS`）。連打や短時間の再検索を抑えて `too_many_requests` を防ぐ。
- **検索の前方一致**: Firestore は `name >= q` かつ `name <= q + '\uf8ff'` で前方一致のみ。部分一致や日本語のあいまい検索は行っていない。
- **画像**: 楽天の画像URLは `next.config.ts` の `remotePatterns` に `*.rakuten.co.jp` と `*.r10s.jp` を追加済み。外部画像は `unoptimized` で表示している箇所あり。

## 6. 動作確認

1. `RAKUTEN_APPLICATION_ID` を設定し、`npm run dev` で起動。
2. `/gears/search` を開き、例として「Strymon」や「BigSky」で検索。
3. 登録済み機材がなければ楽天の結果が出ることを確認。
4. 「この機材のページを作成する」で 1 件保存し、`/gears/[id]` に遷移することを確認。
