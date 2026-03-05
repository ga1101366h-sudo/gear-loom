# Firestore ルールの反映手順

フォロー機能などで使う Firestore のセキュリティルールを反映する方法は **2通り** あります。

---

## 方法A: Firebase コンソール（ブラウザ）で反映する

CLI を使わず、ブラウザだけでルールを更新する手順です。

### 1. Firebase コンソールを開く

1. ブラウザで **https://console.firebase.google.com/** を開く
2. 対象のプロジェクト（Gear-Loom 用）をクリックして選択

### 2. Firestore のルール画面を開く

1. 左メニューで **「Firestore Database」** をクリック
2. 上部タブで **「ルール」** をクリック

### 3. ルールを書き換える

1. エディタに表示されている現在のルールを **すべて選択**（Ctrl+A / Cmd+A）して削除
2. プロジェクト直下の **`firestore.rules`** の内容を **すべてコピー** してエディタに貼り付け
   - ファイル: `firestore.rules`（リポジトリ直下）
   - **重要**: `profiles` の読取は **`allow read: if request.auth != null;`**（認証済みなら可）にしてください。これがないと会員登録後のマイページで権限エラーになります。

### 4. ルールを公開する

1. 画面右上の **「公開」** ボタンをクリック
2. 確認ダイアログで **「公開」** を押す
3. 「ルールが正常に公開されました」と出れば完了

反映までに数十秒かかることがあります。その後、アプリから再度フォロー操作を試してください。

---

## 方法B: Firebase CLI でデプロイする

コマンドラインからルールだけをデプロイする手順です。一度設定すれば、以降は `firebase deploy --only firestore:rules` だけで更新できます。

### 1. Node.js が入っているか確認

```powershell
node -v
```

バージョンが表示されれば OK（v14 以上推奨）。

### 2. Firebase CLI を入れる（未導入の場合）

```powershell
npm install -g firebase-tools
```

### 3. Firebase にログイン

```powershell
firebase login
```

ブラウザが開くので、Firebase プロジェクトで使っている Google アカウントでログインします。

### 4. プロジェクトで Firebase を初期化（初回だけ）

プロジェクトのルート（`c:\dev\gear-nexus`）で実行します。

```powershell
cd c:\dev\gear-nexus
firebase init firestore
```

- **「Use an existing project」** を選び、一覧から Gear-Loom 用のプロジェクトを選択
- **「What file should be used for Firestore Rules?」** はそのまま **`firestore.rules`** で Enter
- **「What file should be used for Firestore indexes?」** は必要なら `firestore.indexes.json`、不要なら Enter でスキップで OK

これで `firebase.json` と `.firebaserc` が作成され、`firestore.rules` がルールファイルとして指定されます。

### 5. ルールをデプロイする

```powershell
firebase deploy --only firestore:rules
```

- 「Deploy complete」と出れば反映完了です。
- 今後ルールを変えたときも、同じコマンドで再デプロイできます。

---

## うまくいかないとき

- **「権限がありません」**  
  → `firebase login` でログインしているアカウントが、その Firebase プロジェクトのオーナー/編集者になっているか確認してください。
- **「プロジェクトが見つからない」**  
  → `firebase use` でプロジェクトを指定します。  
  `firebase use <プロジェクトID>`  
  （プロジェクトIDは Firebase コンソールの「プロジェクトの設定」で確認できます。）
- **反映後もアプリで権限エラーが出る**  
  → 1〜2分待ってから再度操作してみてください。ルールの反映に少し遅れが出ることがあります。

---

## まとめ

| 方法 | こんなときに便利 |
|------|------------------|
| **方法A（コンソール）** | CLI を入れたくない / たまにしかルールを変えない |
| **方法B（CLI）** | ルールをよく編集する / コマンドで一発デプロイしたい |

どちらか都合のよい方で、`firestore.rules` の内容を Firebase に反映してください。
