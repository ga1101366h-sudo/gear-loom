# 画面確認手順（Gear-Loom）

現状の画面を確認するための具体的な手順です。

---

## 前提

- **Node.js** と **npm** がインストールされていること
- ターミナル（PowerShell やコマンドプロンプト）を開けること

---

## 手順 1: プロジェクトフォルダへ移動

ターミナルで次を実行します。

```powershell
cd c:\dev\gear-nexus
```

（依存関係は既に `npm install` 済みの想定です。未実施の場合は先に `npm install` を実行してください。）

---

## 手順 2: 環境変数ファイルの用意

アプリは Supabase の URL とキーを参照するため、未設定だと起動時にエラーになります。  
**「画面だけ見る」** 場合でも、ダミーでよいので値を設定してください。

1. プロジェクト直下に **`.env.local`** を作成します。
2. 次の内容をコピーして貼り付けます。

```env
# 画面確認用（ダミーでOK。認証・DB は動作しません）
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
```

- 本番や認証・投稿まで試す場合は、[Supabase のセットアップ](#supabase-を設定した場合) で取得した値に差し替えます。

---

## 手順 3: 開発サーバーを起動する

同じターミナルで次を実行します。

```powershell
npm run dev
```

次のような表示が出れば起動成功です。

```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Turbopack
```

このターミナルは **閉じずにそのまま** にしておきます。

---

## 手順 4: ブラウザで開く URL と確認内容

ブラウザで **http://localhost:3000** を開き、以下の順で画面を確認します。

| # | 開くURL | 確認したい画面・ポイント |
|---|--------|---------------------------|
| 1 | **http://localhost:3000/** | **トップページ**。タイトル「Gear-Loom」、無料会員登録・ログイン・投稿するボタン、みんなのいいね、楽器別情報、人気機材、ブランドで選ぶ、ギアレビュー（最近の投稿）など。 |
| 2 | **http://localhost:3000/reviews** | **レビュー一覧**。カード一覧（データがなければ「まだレビューがありません」）。ヘッダーの「楽器別情報」「ギアレビュー」「無料会員登録」「ログイン」「投稿する」など。 |
| 3 | **http://localhost:3000/login** | **ログイン画面**。メール・パスワード入力、「ログイン」「Google でログイン」、登録用の切り替えリンク。Supabase 未設定のままでは実際のログインはできません。 |
| 4 | **http://localhost:3000/reviews/new** | **投稿画面**。カテゴリ（必須）、タイトル・機材名・5段階評価・スペックタグ・本文（Markdown）・画像。Supabase 未設定のままでは投稿は保存されません。 |
| 5 | **http://localhost:3000/reviews/（適当なUUID）** | **詳細画面**。Supabase にデータがなければ 404 になります。データがある場合は本文・画像・**EC検索リンク**（Amazon / 楽天 / サウンドハウス / デジマート）を表示。 |
| 6 | **http://localhost:3000/profile** | **プロフィール編集**。未ログインの場合はログイン画面へリダイレクトされます。 |

- **ヘッダー** … どのページでも「GearNexus」ロゴ、「トップ」「投稿する」「ログイン」が共通で出ているか確認します。
- **デザイン** … ダークベース・エレクトリックブルー（#00D4FF）・半透明のカード（グラスモーフィズム）になっているか確認します。

---

## 手順 5: 開発サーバーを止める

確認が終わったら、サーバーを起動したターミナルで **Ctrl + C** を押して開発サーバーを停止します。

---

## Supabase を設定した場合（認証・投稿まで試す）

1. [Supabase](https://supabase.com) でプロジェクトを作成する。
2. **SQL Editor** で `supabase/migrations/001_initial_schema.sql` を実行する。
3. **Authentication > Providers** で「Email」と「Google」を有効にする。
4. **Storage** でバケット `review-images` を **Public** で作成する。
5. **Settings > API** で「Project URL」と「anon public」キーをコピーする。
6. `.env.local` を次のように書き換える。

```env
NEXT_PUBLIC_SUPABASE_URL=（Project URL）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public キー）
```

7. 開発サーバーを再起動する（`Ctrl+C` で止めてから `npm run dev`）。
8. 再度 **http://localhost:3000** を開き、  
   - **トップ** … レビューが表示されるか  
   - **ログイン** … メール登録 or Google でログインできるか  
   - **投稿** … カテゴリ・タイトル・機材名などを入力して投稿できるか  
   - **詳細** … 投稿したレビューを開き、本文と **EC検索リンク** が表示されるか  
   を確認します。

---

## うまく表示されないとき

- **「Missing Supabase env」などと出る**  
  → `.env.local` が `c:\dev\gear-nexus` 直下にあるか、`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されているか確認する。変更した場合は `npm run dev` をやり直す。

- **ポート 3000 が使われている**  
  → 別のターミナルで `npm run dev` が既に動いていないか確認する。別ポートで起動したい場合は `npm run dev -- -p 3001` のようにして **http://localhost:3001** を開く。

- **白画面やエラーページ**  
  → ブラウザの開発者ツール（F12）の「Console」タブでエラー内容を確認する。
