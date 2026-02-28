# Gear-Loom

楽器演奏者向け UGC（ユーザー生成コンテンツ）プラットフォーム。機材レビューを共有し、Amazon・楽天・サウンドハウス・デジマートへの検索リンクを自動生成します。

## 技術スタック

- **Framework**: Next.js 15 (App Router), TypeScript
- **UI**: Tailwind CSS, shadcn/ui 風コンポーネント（Radix UI）
- **BaaS**: Supabase（Auth / Database / Storage）

## セットアップ

### 1. 依存関係のインストール

```bash
cd gear-nexus
npm install
```

### 2. Supabase プロジェクト作成

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. **SQL Editor** で次を順に実行  
   - `supabase/migrations/001_initial_schema.sql`  
   - `supabase/migrations/002_categories_makers.sql`（ジャンル細分化・メーカー追加用）  
   - `supabase/migrations/003_mypage_likes_events.sql`（自己紹介・いいね・ライブ予定用）
3. **Authentication > Providers** で「Email」「Google」「Twitter(X)」を有効化（X は API Key/Secret の設定が必要）
4. **Storage** でバケット `review-images` を新規作成（Public にチェック）

### 3. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を設定してください。

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクト URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key
- （任意）`NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` / `NEXT_PUBLIC_RAKUTEN_AFFILIATE_TAG`: EC 検索リンク用

### 4. 開発サーバー起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 主な機能

- **認証**: メール・パスワード / Google / X（Twitter）ログイン（Supabase Auth）
- **プロフィール**: 担当楽器・所有機材・SNS リンク編集（`/profile`）
- **カテゴリ**: ギター、ギターエフェクター、ベース、ベースエフェクター、ドラム、ボーカル、鍵盤、DTM・その他
- **メーカー・ブランド**: トップで検索ボックス付き一覧。レビュー投稿時に未登録のメーカーを入力すると一覧に追加される
- **投稿は登録ユーザーのみ**: 非登録は閲覧のみ。投稿画面は未ログイン時はログインへリダイレクト
- **マイページ**（`/mypage`）: 自己紹介・自分の投稿一覧・もらったイイね数・ライブ予定カレンダー（予定の追加・削除）
- **レビューいいね**: レビュー詳細でいいね可能（登録ユーザーのみ）。マイページで合計表示
- **プロフィール編集**: 表示名・自己紹介（bio）・担当楽器・SNS 等（マイページに表示）
- **レビュー投稿**: ジャンル（必須）・メーカー（任意・新規追加可）・タイトル・機材名・5 段階評価・本文（Markdown）・画像複数・スペックタグ
- **EC 検索リンク**: 機材名から Amazon / 楽天 / サウンドハウス / デジマートの検索 URL を自動生成

## デザイン

- ダークモード基調
- アクセントカラー: エレクトリック・ブルー（`#00D4FF`）
- カード: グラスモーフィズム（半透明 + ぼかし）
- モバイルファースト

## ディレクトリ構成

```
src/
├── app/
│   ├── auth/callback/   # OAuth コールバック
│   ├── login/           # ログイン・登録
│   ├── profile/         # プロフィール編集
│   ├── reviews/
│   │   ├── [id]/        # レビュー詳細（EC リンク表示）
│   │   ├── new/         # レビュー投稿
│   │   └── page.tsx     # レビュー一覧
│   ├── layout.tsx
│   ├── page.tsx         # トップ
│   └── globals.css
├── components/
│   ├── ui/              # ボタン・カード・入力など
│   └── ec-search-links.tsx
├── lib/
│   ├── supabase/        # クライアント・サーバー用 Supabase
│   ├── ec-links.ts      # EC 検索 URL 生成
│   └── utils.ts
└── types/
    └── database.ts
supabase/
└── migrations/
    └── 001_initial_schema.sql
```

## ライセンス

MIT
