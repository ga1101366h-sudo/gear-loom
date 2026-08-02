# Gear-Loom

楽器演奏者向け UGC（ユーザー生成コンテンツ）プラットフォーム。機材レビューを共有し、Amazon・楽天・サウンドハウス・デジマートへの検索リンクを自動生成します。

## 技術スタック

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui 風コンポーネント（Radix UI）
- **データベース**: PostgreSQL（Supabase でホスト）— アクセスは Prisma 経由。共通機材DB・ボード保存に使用
- **認証 / Firestore / ストレージ**: Firebase（Firebase Auth・Cloud Firestore・Cloud Storage）。サーバー側は Firebase Admin SDK
- **ボード作図**: @xyflow/react（React Flow）
- **画像処理**: @imgly/background-removal（ブラウザ内 WASM 推論による背景透過）, browser-image-compression
- **解析 / SEO**: Google Analytics 4, JSON-LD 構造化データ, 動的サイトマップ（`src/app/sitemap.ts`）, `public/robots.txt`
- **テスト / CI**: Playwright E2E, GitHub Actions（`.github/workflows/playwright.yml`）
- **ホスティング**: Vercel（リージョン `hnd1`）

> Supabase は PostgreSQL のマネージドホストとしてのみ利用しています。Supabase の SDK（`@supabase/*`）は使用していません（Auth・Storage は Firebase）。

## セットアップ

### 1. 依存関係のインストール

```bash
cd gear-nexus
npm install
```

### 2. Firebase プロジェクト作成

1. [Firebase](https://console.firebase.google.com) でプロジェクトを作成
2. **Authentication > Sign-in method** で「メール/パスワード」「Google」「Twitter(X)」を有効化
3. **Cloud Firestore** と **Cloud Storage** を有効化
4. サーバー用に **サービスアカウント**の秘密鍵を発行（`FIREBASE_ADMIN_*` に設定）

Firestore / Storage のセキュリティルールとインデックスはリポジトリで管理しています
（`firestore.rules` / `storage.rules` / `firestore.indexes.json` / `firebase.json`）。

### 3. データベース（PostgreSQL / Prisma）

`DATABASE_URL` に PostgreSQL の接続先を設定したうえで、スキーマを反映します。

```bash
npx prisma generate
npx prisma db push
```

スキーマ定義は `prisma/schema.prisma`（`User` / `Gear` / `UserGear` / `Pedalboard` / `Board` / `BoardPost`）。
マイグレーション履歴は `prisma/migrations/` にあります。
`npm run build` 実行時には `prisma generate` が自動で走ります。

### 4. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を設定してください。

```bash
cp .env.example .env.local
```

必須:

- `DATABASE_URL`: PostgreSQL 接続文字列
- `NEXT_PUBLIC_FIREBASE_API_KEY` / `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` / `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` / `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` / `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase クライアント設定
- `FIREBASE_ADMIN_PROJECT_ID` / `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY`: Firebase Admin SDK（サーバー側）

任意:

- `NEXT_PUBLIC_GA_ID`: GA4 測定 ID（未設定時は計測タグを出力しない）
- `NEXT_PUBLIC_ADMIN_UID`: 管理者 UID（`/admin/announcements` でお知らせを追加できるユーザー）
- `GEMINI_API_KEY` / `OPENAI_API_KEY`: 記事本文の AI 補正（Gemini を優先し、失敗時は OpenAI にフォールバック）
- `X_OAUTH_CLIENT_ID` / `X_OAUTH_CLIENT_SECRET` / `X_OAUTH_REDIRECT_URI` / `X_OAUTH_STATE_SECRET`: X（Twitter）OAuth 2.0
- `NEXT_PUBLIC_APP_ORIGIN`: 本番のオリジン（コールバック後のリダイレクト先）
- `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` / `NEXT_PUBLIC_RAKUTEN_AFFILIATE_TAG`: EC 検索リンク用

### 5. 開発サーバー起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 主な機能

- **認証**: メール・パスワード / Google / X（Twitter）ログイン（Firebase Auth）
- **プロフィール**: 担当楽器・所有機材・SNS リンク編集（`/profile`）
- **カテゴリ**: ギター、ギターエフェクター、ベース、ベースエフェクター、ドラム、ボーカル、鍵盤、DTM・その他
- **メーカー・ブランド**: トップで検索ボックス付き一覧。レビュー投稿時に未登録のメーカーを入力すると一覧に追加される
- **投稿は登録ユーザーのみ**: 非登録は閲覧のみ。投稿画面は未ログイン時はログインへリダイレクト
- **マイページ**（`/mypage`）: 自己紹介・自分の投稿一覧・もらったイイね数・ライブ予定カレンダー（予定の追加・削除）
- **レビューいいね**: レビュー詳細でいいね可能（登録ユーザーのみ）。マイページで合計表示
- **プロフィール編集**: 表示名・自己紹介（bio）・担当楽器・SNS 等（マイページに表示）
- **レビュー投稿**: ジャンル（必須）・メーカー（任意・新規追加可）・タイトル・機材名・5 段階評価・本文（Markdown）・画像複数・スペックタグ
- **EC 検索リンク**: 機材名から Amazon / 楽天 / サウンドハウス / デジマートの検索 URL を自動生成

### エフェクターボード

- **ボードエディタ**（`/board/editor`）: エフェクターを配置し、React Flow（`@xyflow/react`）でケーブル配線をベジェ曲線として描画。`html-to-image` の `toPng` でキャンバスのサムネイルを生成（`src/components/board-flow-editor.tsx`）
- **ボード公開・共有**（`/boards`, `/boards/publish`, `/post/board`）: 作成したボードを「みんなのエフェクターボード」に公開・投稿。投稿の編集も可能
- **ボード解析 API**（`/api/board/analyze`）: ボード構成の解析
- **プロフィール埋め込み**（`/embed/users/[userId]`）: 外部サイトに自分のプロフィールを埋め込むための埋め込み用ページ

### 機材・レビュー

- **機材ページ**（`/gears/[id]`）: 機材ごとの詳細ページ
- **機材検索**（`/gears/search`）: 機材名で検索し、登録済み機材や楽天の商品から機材ページを作成
- **レビュー比較**（`/reviews/compare`）: 気になる機材を比較リストに入れて見比べる
- **フォト**（`/photos`）: 投稿された機材・楽器の画像ギャラリー。カテゴリ絞り込み・シャッフル表示
- **カスタム手帳**（`/notebook`）: 所有機材の改造・メンテ内容（使用パーツ・音の変化など）を記録
- **楽器別情報**（`/instruments`）: 楽器ごとの情報ページ
- **所有機材管理**（`/mypage/gear`）: 自分の所有機材の登録・管理。所有機材・ボード・ボード投稿の並べ替えは `@dnd-kit`（sortable）で実装

### コミュニティ

- **フォロー**: ユーザーのフォロー／フォロワー数表示、フォロー中ユーザーのレビュータイムライン（`/api/me/following-reviews`）
- **公開プロフィール**（`/users/[userId]`）: 他ユーザーのプロフィール・レビュー・所有機材・ボードを閲覧
- **いいね一覧**（`/likes`）: いいねしたレビューの一覧
- **ブログ**（`/blog`）: 機材の使いこなしやイベントレポートなどの記事
- **イベント**（`/events`）／**ライブ日程・周辺スポット**（`/live-spots`）: ライブ日程カレンダーと、近くの楽器屋・ライブハウスの Google マップ検索
- **おしらせ**（`/announcements`）: 運営からのお知らせ一覧
- **管理者ページ**（`/admin`）: レビュー・ユーザー・お知らせ・ライブイベント・カスタム手帳の管理（`NEXT_PUBLIC_ADMIN_UID` と一致するユーザーのみ）

### その他

- **X（Twitter）連携サインアップ**（`/signup/x`）: X の OAuth 2.0 でプロフィールを取得して登録
- **AI 機能**: 記事本文の AI 補正（`/api/ai/improve-body`。Gemini 優先・失敗時 OpenAI にフォールバック）／画像の背景透過（`@imgly/background-removal` によるブラウザ内 WASM 推論）
- **動的 OGP**: レビューの OGP 画像生成（`src/lib/review-og-image.ts`）と OGP プロキシ（`/api/og-proxy`）

> メモ: SEO / AdSense 審査向けに、メタデータ最適化と動的サイトマップ（`/sitemap.xml`）生成、JSON-LD 構造化データ、GA4 を導入しています。

## デザイン

- ダークモード基調
- アクセントカラー: エレクトリック・ブルー（`#00D4FF`）
- カード: グラスモーフィズム（半透明 + ぼかし）
- モバイルファースト

## ディレクトリ構成

```
src/
├── actions/                 # サーバーアクション（board / board-post / user-gears）
├── app/                     # App Router
│   ├── api/                 # API ルート
│   ├── auth/                # コールバック・パスワード更新
│   ├── login/ signup/ onboarding/
│   ├── profile/ mypage/ users/ likes/
│   ├── reviews/             # レビュー一覧・詳細・投稿・編集
│   ├── gears/ category/ instruments/ photos/
│   ├── board/ boards/ embed/ notebook/
│   ├── blog/ events/ live-spots/ announcements/ post/
│   ├── admin/ about/ contact/ help/ privacy/ terms/
│   ├── layout.tsx
│   ├── page.tsx             # トップ
│   ├── sitemap.ts           # 動的サイトマップ
│   └── globals.css
├── components/
│   ├── analytics/           # google-analytics.tsx（GA4）
│   ├── seo/                 # json-ld.tsx（構造化データ）
│   ├── ui/                  # ボタン・カード・入力など
│   └── ec-search-links.tsx
├── contexts/
│   └── AuthContext.tsx      # Firebase Auth
├── data/                    # カテゴリ・ブランド等の静的データ
├── hooks/
├── lib/
│   ├── firebase/            # client / admin / data
│   ├── prisma.ts            # Prisma クライアント
│   ├── ec-links.ts          # EC 検索 URL 生成
│   └── utils.ts
├── scripts/
└── types/
    └── database.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
tests/                       # Playwright E2E
public/                      # robots.txt / ads.txt
supabase/                    # ※旧構成の名残（現在は未使用）
```

## ライセンス

MIT
