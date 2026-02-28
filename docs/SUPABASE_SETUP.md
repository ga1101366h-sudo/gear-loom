# Supabase 設定手順（Gear-Loom）

Gear-Loom でログイン・アカウント作成・Google/X ログインを動かすために、Supabase ダッシュボードで行う設定をまとめています。

---

## 1. 認証まわり（必須）

### 1-1. リダイレクト URL の追加

**Authentication** → **URL Configuration**（または **Redirect URLs**）を開く。

次の URL を **Redirect URLs** に追加する（本番ドメインがある場合はそれも追加）。

- 開発: `http://localhost:3000/auth/callback`
- 開発: `http://localhost:3000/auth/update-password`
- 本番: `https://あなたのドメイン/auth/callback`
- 本番: `https://あなたのドメイン/auth/update-password`

**Site URL** を開発時は `http://localhost:3000`、本番は `https://あなたのドメイン` にしておく。

### 1-2. メール確認（Confirm email）の扱い

**Authentication** → **Providers** → **Email** を開く。

- **Confirm email** をオンにしている場合  
  - 登録後に「確認メール」が届く  
  - メール内の「メールを確認してください」リンクを開くと「メール確認済み」になり、**そのあと**登録時に設定したパスワードでログインできる  
- **Confirm email** をオフにしている場合  
  - 登録後すぐ、設定したパスワードでログインできる  

「メールを確認してください」を押したのにログインできない場合は、**登録時に入力したパスワード**をそのまま使ってログインしてみてください。違うパスワードを入れていると「Invalid login credentials」になります。  
パスワードを忘れた場合は、ログイン画面の **「パスワードを忘れた場合」** からリセット用メールを送信し、届いたリンクで新しいパスワードを設定できます。

---

## 2. Google ログイン（任意）

1. **Authentication** → **Providers** → **Google** を開く。
2. **Enable Sign in with Google** をオンにする。
3. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 のクライアント ID を作成し、**Client ID** と **Client Secret** をコピーする。
4. Supabase の **Client ID** と **Client Secret** に貼り付けて保存する。

※ 認証情報の「承認済みのリダイレクト URI」に、Supabase の「Callback URL」に表示されている URL を追加する必要があります。

---

## 3. X（Twitter）ログイン（任意）

1. **Authentication** → **Providers** → **Twitter** を開く。
2. **Enable Sign in with Twitter** をオンにする。
3. [Twitter Developer Portal](https://developer.twitter.com/) でアプリを作成し、**API Key** と **API Secret** を取得する。
4. Supabase の **Client ID**（API Key）と **Client Secret**（API Secret）に貼り付けて保存する。

※ アプリの設定で Callback URL に、Supabase の「Callback URL」を登録する必要があります。

---

## 4. データベース（初回のみ）

アプリ用のテーブルを作るため、**SQL Editor** で次のマイグレーションを **001 → 002 → 003 → 004** の順に実行する。

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_categories_makers.sql`
- `supabase/migrations/003_mypage_likes_events.sql`
- `supabase/migrations/004_user_id_phone.sql`

---

## 5. ログインできないときの確認

- **Invalid login credentials**  
  - 登録時に設定したパスワードと一致しているか確認する。  
  - 忘れた場合は「パスワードを忘れた場合」でリセット用メールを送り、届いたリンクから新しいパスワードを設定する。
- **メール確認リンクを押したあと**  
  - リンクを開いただけではパスワードは変わりません。  
  - これまで使っていた「登録時のパスワード」でログインする。
- **リセット用メールが届かない**  
  - Supabase の **Authentication** → **Email Templates** や、プロジェクトのメール送信設定を確認する。  
  - 開発中は **Rate limit** や **SMTP 設定**で送信が制限されている場合がある。

---

※ ダッシュボードのメニュー名や場所は、Supabase のバージョンで多少変わることがあります。  
※ こちらからあなたの Supabase プロジェクトに直接ログインして設定を変更することはできません。上記を参考に、ご自身のダッシュボードで設定してください。
