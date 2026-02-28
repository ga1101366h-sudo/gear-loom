# Gemini（Firebase 連携）へ送る指示文

以下をコピーして Firebase に連携している Gemini に送ってください。

---

## 指示文（コピー用）

```
Next.js アプリ「Gear-Loom」（楽器・機材レビュー UGC サイト）で Firebase を使うため、次の設定を実施してください。

【1】Firebase プロジェクト
- 新規プロジェクトを作成するか、既存プロジェクトを指定してください。
- プロジェクト ID を教えてください。

【2】Authentication（認証）の有効化
- サインイン方法で以下を有効にしてください。
  - メール/パスワード
  - Google
  - X（Twitter）※後からでも可
- メール/パスワードは「メールリンク」は不要で、「メール/パスワード」のみ有効でOKです。

【3】Firestore Database の有効化
- Firestore を有効化し、本番モードで作成してください。
- 以下のコレクションを使います（初回は空でOK。categories と spec_tags は後でドキュメントを追加します）:
  - profiles（ドキュメントID = Auth UID）
  - reviews
  - categories
  - spec_tags
  - makers
  - review_likes
  - live_events

【4】Storage の有効化
- Cloud Storage を有効化してください。レビュー画像のアップロードに使います。

【5】Web アプリ用の設定値の取得
- Firebase Console の「プロジェクトの設定」→「一般」→「マイアプリ」で、Web アプリ（</>）を追加または選択し、以下 6 つの値を教えてください。
  - apiKey
  - authDomain
  - projectId
  - storageBucket
  - messagingSenderId
  - appId

【6】サービスアカウント鍵（サーバー用）の取得
- 「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」で JSON 鍵を生成してください。
- その JSON から次の 3 つを教えてください（private_key は改行を \n のままの文字列でOKです）:
  - project_id → FIREBASE_ADMIN_PROJECT_ID
  - client_email → FIREBASE_ADMIN_CLIENT_EMAIL
  - private_key → FIREBASE_ADMIN_PRIVATE_KEY

【7】Firestore セキュリティルール（任意・後からでも可）
- 以下のルールを Firestore の「ルール」に設定してください。

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.author_id == request.auth.uid;
    }
    match /categories/{id} { allow read: if true; allow write: if false; }
    match /spec_tags/{id} { allow read: if true; allow write: if false; }
    match /makers/{id} { allow read: if true; allow create: if request.auth != null; }
    match /review_likes/{id} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow delete: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
    match /live_events/{id} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
  }
}

【8】出力してほしい形式
- 最後に、ローカル開発用の .env.local に貼り付ける形で、次の変数名と値の一覧を出してください（値は実際のものに置き換え、private_key はダブルクォートで囲んでください）:

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

---

## 指示文を送ったあと

1. Gemini から返ってきた **環境変数の値** を、プロジェクト直下の `.env.local` に貼り付け保存する。
2. **categories** と **spec_tags** に初期データを入れると、レビュー投稿画面でカテゴリ・タグが選べます。  
   - 入れる内容は `docs/FIREBASE_SETUP.md` の「Firestore コレクション」や、Supabase のマイグレーション `001_initial_schema.sql` の categories / spec_tags を参考にしてください。
3. 開発サーバーを再起動して、`http://localhost:3000/login` からログインまたは新規登録を試す。
