# Supabase を Gear-Loom に繋ぐ手順

プロジェクトはもう作ってあるので、あとは「キーをアプリに渡す」と「DB のテーブルを作る」だけです。

---

## 1. キーをコピーする

1. 左メニュー **Settings（歯車アイコン）** をクリック
2. **API** をクリック
3. 以下をコピー（メモ帳に貼っておく）
   - **Project URL**（`https://xxxx.supabase.co` のようなやつ）
   - **Project API keys** の **anon** **public**（長い文字列。「Reveal」で表示）

---

## 2. アプリの .env.local に書く

1. プロジェクトの **ルート**（`gear-nexus` フォルダ）に `.env.local` を作る（なければ）
2. 次の 2 行を入れる（値は 1 でコピーしたものに置き換え）

```env
NEXT_PUBLIC_SUPABASE_URL=ここに Project URL を貼る
NEXT_PUBLIC_SUPABASE_ANON_KEY=ここに anon public キーを貼る
```

3. 保存する

---

## 3. データベースのテーブルを作る（SQL を実行）

1. 左メニュー **SQL Editor** をクリック
2. **New query** で新しいクエリを開く
3. 下の 4 つのファイルを **順番に** 開いて、中身をすべてコピーし、SQL Editor に貼って **Run** する  
   （1 回に 1 ファイルずつで OK）

   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_categories_makers.sql`
   - `supabase/migrations/003_mypage_likes_events.sql`
   - `supabase/migrations/004_user_id_phone.sql`

4. それぞれ「Success」が出れば OK

---

## 4. テストユーザーを 1 人作る（どちらか一方でOK）

- **方法A（おすすめ）**  
  Supabase ダッシュボード → **Authentication** → **Users** → **Add user**  
  → Email: `test@example.com`、Password: `testpass123` で作成。
- **方法B**  
  `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を入れて `npm run seed:test-user` を実行。

## 5. アプリを起動して確認

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く。

- **通常**  
  **ログイン** → **登録** でテスト用のメール・パスワード・ユーザーID を入れて登録。
- **「Supabase に接続できません」になる場合**  
  ログイン画面の開発用の枠にある **「サーバー経由でテストログイン（test@example.com）」** を押す。サーバー経由で Supabase にログインし、そのままログイン扱いになる。

---

## うまくいかないとき

- 「接続できません」→ .env.local の 2 行が正しいか、**開発サーバーを一度止めてから** `npm run dev` し直す
- 「確認中にエラー」→ 3 の SQL を 001 から 004 まで全部実行したか確認する
