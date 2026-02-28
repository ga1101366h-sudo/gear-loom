# Firebase セットアップ（Gear-Loom）

## 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** を有効化
   - サインイン方法: **メール/パスワード**、**Google**、**X (Twitter)** を有効化
3. **Firestore Database** を有効化（本番モードで開始後、ルールを設定）
4. **Storage** を有効化（レビュー画像用）

## 2. 環境変数（.env.local）

クライアント用（Next.js から参照）:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
# 管理者のお知らせ作成用（任意）。Firebase Auth の UID を指定すると /admin/announcements でお知らせを追加可能
# NEXT_PUBLIC_ADMIN_UID=your-firebase-auth-uid
```

サーバー用（check-user-id API など）:

```env
FIREBASE_ADMIN_PROJECT_ID=xxx
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- **サービスアカウント鍵**: Firebase Console → プロジェクトの設定 → サービスアカウント → 新しい秘密鍵の生成

## 3. Firestore コレクション

- **profiles**: ドキュメント ID = Firebase Auth UID。`display_name`, `user_id`, `avatar_url`, `bio` など
- **reviews**: レビュー。`author_id`, `category_id`, `title`, `gear_name`, `rating`, `body_md`, `created_at`, `category_name_ja`, `author_display_name`, `author_user_id`, `review_images` など
- **categories**: カテゴリ。`slug`, `name_ja`, `name_en`, `sort_order`, `group_slug`
- **spec_tags**: スペックタグ。`slug`, `name_ja`
- **makers**: メーカー。`name`, `group_slug`
- **review_likes**: いいね。`review_id`, `user_id`, `created_at`
- **live_events**: ライブ予定。`user_id`, `title`, `event_date`, `venue`, `venue_url`, `description`
- **announcements**: 管理者お知らせ（トップの「管理者からのお知らせ」）。`title`, `url`, `published_at`, `created_at`。管理者のみ作成可能（`NEXT_PUBLIC_ADMIN_UID` と一致する UID のユーザーが `/admin/announcements` で追加）

初回は **categories** と **spec_tags** にデータを手動またはスクリプトで投入してください（Supabase の初期データを参考に）。

### Firestore 複合インデックス（任意）

投稿画面でカテゴリ選択時に「makers」の `group_slug` + `name` でクエリする場合は複合インデックスが必要です。現在の実装では **インデックスなし** で動作します（取得後にクライアントで名前順ソート）。

サーバー側でソートしたい場合や、エラーでインデックス作成リンクが表示された場合は次のいずれかで対応できます。

- **Firebase Console**: エラーメッセージ内のリンクを開き、「インデックスを作成」をクリック
- **Firebase CLI**: プロジェクトルートの `firestore.indexes.json` を編集し、`firebase init firestore` のあと `firebase deploy --only firestore` でデプロイ

## 4. Firestore セキュリティルール例

```
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
    match /makers/{id} {
      allow read: if true;
      allow create: if request.auth != null;
    }
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
    match /announcements/{id} {
      allow read: if true;
      allow create: if request.auth != null;  // 本番では request.auth.uid == '管理者のUID' に制限推奨
      allow update, delete: if request.auth != null;
    }
  }
}
```

## 5. Storage ルール

アイコン変更で `storage/unauthorized` が出る場合は、**Firebase Console → Storage → ルール** で以下を設定してください。

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを開く
2. 左メニュー **Storage** → **ルール** タブ
3. 既存のルールを、下記のいずれかに**置き換え**（または `avatars` 用の `match` を追加）

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /review-images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. **公開** をクリックして保存

- **avatars/{userId}/** … ログイン中のユーザーが、自分の `userId` と一致するパスにだけアップロード可能
- **review-images/** … 認証済みユーザーがレビュー画像をアップロード可能、誰でも閲覧可能

プロジェクトルートに `storage.rules` も用意しています。Firebase CLI を使う場合は `firebase deploy --only storage` でデプロイできます。

## 6. X (Twitter) ログイン

Firebase Console の Authentication → サインイン方法で **X** を有効にし、X Developer Portal でアプリを作成して API Key / Secret を Firebase に登録します。
