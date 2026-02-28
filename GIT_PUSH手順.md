# GitHub への push 手順（実行済み・残作業）

## すでに実行したこと

1. **`.gitignore` を作成**  
   `.env` / `.env.local` / `.env*.local` を除外するように設定済みです。

2. **環境変数ファイルの除外確認**  
   - `.env.local` はステージングされていません（`.gitignore` が有効）
   - コミットに含まれるのは `.env.example` のみです。

3. **Git 初期化と初回コミット**
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit: Gear-Loom (Next.js + Firebase)"`
   - ブランチ名を `main` に変更（`git branch -M main`）
   - リモートを追加：`git remote add origin https://github.com/ga1101366h-sudo/gear-nexus.git`

## あなたが行うこと

### リポジトリ名について

リモート URL には **`gear-nexus`** を使っています。  
GitHub で別の名前のリポジトリを作った場合は、次のコマンドで URL を書き換えてください。

```powershell
cd c:\dev\gear-nexus
git remote set-url origin https://github.com/ga1101366h-sudo/ここにリポジトリ名を入れる.git
```

### push の実行

ターミナルで次を実行してください。認証を求められたら、GitHub のユーザー名と **Personal Access Token（PAT）** を入力します（パスワードは使えません）。

```powershell
cd c:\dev\gear-nexus
git push -u origin main
```

- **HTTPS** の場合：ユーザー名 = GitHub のユーザー名、パスワード = PAT
- **SSH** を使う場合：  
  `git remote set-url origin git@github.com:ga1101366h-sudo/gear-nexus.git` に変更してから上記 `git push` を実行

### 初回 push 前の確認（任意）

`.env` 系がコミットに含まれていないか確認するには：

```powershell
cd c:\dev\gear-nexus
git log -1 --name-only
```

一覧に `.env` や `.env.local` が**出てこなければ**問題ありません。
