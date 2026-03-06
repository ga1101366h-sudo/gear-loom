# Firebase 操作手順（Gear-Loom）

Firebase コンソールや CLI で行う主な操作を、手順付きでまとめています。

---

## 目次

1. [Firestore ルールの反映](#1-firestore-ルールの反映)
2. [管理者を「他ユーザー記事の編集可能」にする設定](#2-管理者を他ユーザー記事の編集可能にする設定)
3. [Storage ルールの反映](#3-storage-ルールの反映)
4. [複合インデックスの作成](#4-複合インデックスの作成)
5. [環境変数・サービスアカウントの確認](#5-環境変数サービスアカウントの確認)

---

## 1. Firestore ルールの反映

アプリ側の `firestore.rules` を Firebase に反映する方法です。

### 方法A: Firebase コンソール（ブラウザ）

1. **https://console.firebase.google.com/** を開く
2. 対象プロジェクトを選択
3. 左メニュー **「Firestore Database」** → 上部タブ **「ルール」**
4. エディタの内容を **すべて選択（Ctrl+A）** して削除
5. プロジェクト直下の **`firestore.rules`** を開き、**中身をすべてコピー** してエディタに貼り付け
6. 右上 **「公開」** をクリック → 確認で **「公開」**
7. 「ルールが正常に公開されました」と出れば完了

### 方法B: Firebase CLI

```powershell
cd c:\dev\gear-nexus
firebase login
firebase use <プロジェクトID>   # 初回のみ。プロジェクトIDはコンソールの「プロジェクトの設定」で確認
firebase deploy --only firestore:rules
```

- 初回のみ `firebase init firestore` でプロジェクトを紐づける場合あり
- 詳細は [docs/FIREBASE-RULES-DEPLOY.md](./FIREBASE-RULES-DEPLOY.md) を参照

---

## 2. 管理者を「他ユーザー記事の編集可能」にする設定

管理者が「管理者ページ」から他ユーザーのレビューを編集・削除できるようにするには、**Firestore ルールの反映**に加え、**管理者の Firebase Auth UID を `admins` コレクションに登録**する必要があります。

### 2-1. Firestore ルールを反映する

上記「1. Firestore ルールの反映」を実施し、**現在のプロジェクトの `firestore.rules`** が Firebase にデプロイされていることを確認してください。  
（`reviews` の `update`/`delete` で `admins` の存在チェックを行っているルールになっている必要があります。）

### 2-2. 管理者の「Firebase Auth UID」を確認する

管理者として運用するアカウントで、**Firebase Authentication に登録されている UID** を取得します。

#### やり方1: Firebase コンソールで確認

1. **https://console.firebase.google.com/** → 対象プロジェクト
2. 左メニュー **「Authentication」** → **「ユーザー」** タブ
3. 一覧から管理者にしたいユーザー（メールまたはプロバイダ名）を探す
4. その行の **「ユーザー UID」**（長い英数字の文字列）をコピー  
   - 例: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r`

#### やり方2: アプリでログインした状態で確認（開発者向け）

1. 管理者アカウントでサイトにログイン
2. ブラウザの開発者ツール（F12）→ **Console** タブ
3. 次のコードを貼り付けて実行（Firebase クライアントが読み込まれている画面で）:
   ```javascript
   firebase.auth().currentUser?.uid
   ```
   または、アプリが `getAuth()` を使っている場合:
   ```javascript
   (await import('firebase/auth')).getAuth().currentUser?.uid
   ```
4. 表示された UID をコピー

### 2-3. Firestore に `admins` コレクションとドキュメントを追加する

1. **https://console.firebase.google.com/** → 対象プロジェクト
2. 左メニュー **「Firestore Database」** → **「データ」** タブ
3. **「コレクションを開始」**（または既存コレクション一覧の **「+ コレクションを追加」**）をクリック
4. **コレクション ID** に **`admins`** と入力 → **「次へ」**
5. **ドキュメント ID** に、2-2 でコピーした **管理者の Firebase Auth UID をそのまま** 貼り付け  
   - 例: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r`
6. **フィールド** は次のどちらかでよいです:
   - フィールドを追加しない（空のドキュメントのまま）→ **「保存」**
   - または フィールド名 `role` / 型 **文字列** / 値 `admin` を 1 件追加 → **「保存」**
7. 一覧に **`admins`** コレクションと、その中に **1 件のドキュメント（ID = 管理者の UID）** ができていれば完了

### 2-4. 動作確認

1. 管理者アカウントでログイン
2. **管理者ページ**（ヘッダーの「管理者」リンク）を開く
3. **レビュー一覧** から **他ユーザーが投稿した記事** の **「編集」** をクリック
4. 編集画面で内容を変更して保存し、権限エラーにならないことを確認

### 管理者を追加・解除したい場合

- **追加**: 上記 2-3 と同様に、**別の UID** をドキュメント ID にしたドキュメントを `admins` に 1 件追加
- **解除**: Firestore コンソールで `admins` コレクションを開き、該当 UID のドキュメントを削除

※ `admins` はアプリからは書き込めないため、追加・解除は **Firebase コンソールで手動** で行います。

---

## 3. Storage ルールの反映

レビュー画像やアバター画像用の Storage ルールを反映する手順です。

### 方法A: Firebase コンソール

1. **https://console.firebase.google.com/** → 対象プロジェクト
2. 左メニュー **「Storage」** → 上部タブ **「ルール」**
3. 既存のルールを、プロジェクト直下の **`storage.rules`** の内容で **置き換え**
4. **「公開」** をクリックして保存

### 方法B: Firebase CLI

```powershell
cd c:\dev\gear-nexus
firebase deploy --only storage
```

---

## 4. 複合インデックスの作成

カテゴリ一覧などで「インデックスが必要です」と表示された場合の手順です。

1. エラーメッセージ内の **「インデックスを作成」** または **コンソールのリンク** をクリック
2. ブラウザで Firebase コンソールの **Firestore → インデックス** が開く
3. 表示された内容で **「インデックスを作成」** をクリック
4. 作成完了まで数分かかることがあります。完了後、該当画面を再読み込みして確認

---

## 5. 環境変数・サービスアカウントの確認

### クライアント用（.env.local）

- `NEXT_PUBLIC_FIREBASE_*` は Firebase コンソールの **プロジェクトの設定 → 全般 → マイアプリ** で確認・コピーできます。
- 本番用アプリがなければ「アプリを追加」で Web アプリを追加し、表示される設定値をコピーします。

### サーバー用（Admin SDK）

- **FIREBASE_ADMIN_PROJECT_ID**: プロジェクト ID（コンソールの「プロジェクトの設定」）
- **FIREBASE_ADMIN_CLIENT_EMAIL** / **FIREBASE_ADMIN_PRIVATE_KEY**:  
  **プロジェクトの設定 → サービスアカウント → 「新しい秘密鍵の生成」** で JSON をダウンロードし、その中の `client_email` と `private_key` をコピーします。  
  - 秘密鍵は `.env.local` に貼り付ける際、改行を `\n` のまま 1 行で書くか、ダブルクォートで囲んでください。

詳細は [docs/FIREBASE_SETUP.md](./FIREBASE_SETUP.md) を参照してください。

---

## 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) | 初回セットアップ（プロジェクト作成、認証・Firestore・Storage 有効化、環境変数） |
| [FIREBASE-RULES-DEPLOY.md](./FIREBASE-RULES-DEPLOY.md) | Firestore ルールのデプロイ方法の詳細 |
