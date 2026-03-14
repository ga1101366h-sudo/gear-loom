# E2E テスト (Playwright)

## 実行方法

```bash
# ブラウザのインストール（初回のみ）
npx playwright install

# 開発サーバーを別ターミナルで起動した状態で
npm run dev
npx playwright test tests/e2e

# または webServer 任せで実行（CI では build + start）
npx playwright test tests/e2e
```

## 構成

| ファイル | 内容 |
|----------|------|
| `public-pages.spec.ts` | トップ、/boards、/live-spots、/about 等の非認証ページ |
| `auth-and-profile.spec.ts` | ログイン、プロフィール編集、所持機材の追加・D&D（認証想定） |
| `board-editor.spec.ts` | React Flow、モバイルドロワー、機材画像ジェネレーター |
| `reviews-and-interactions.spec.ts` | レビュー投稿、いいね・お気に入り |
| `admin.spec.ts` | 管理者アクセス制限、ユーザーリスト |

## 認証が必要なテストについて

- **form-validation.spec.ts** のうち、レビュー投稿・機材編集など認証が必要なケースは、**環境変数でテスト用アカウント**を指定すると実行されます。
  ```bash
  E2E_TEST_EMAIL=your-test@example.com E2E_TEST_PASSWORD=yourpassword npx playwright test tests/e2e/form-validation.spec.ts
  ```
  未設定の場合は該当テストはスキップされます。
- **globalSetup**: `playwright.config.ts` の `globalSetup` を有効にし、`tests/e2e/global-setup.ts` でログインして `storageState` を保存する構成も利用できます。
- **API モック**: `page.route()` で Firebase / バックエンド API をモックし、認証なしで所定のレスポンスを返すことも可能です。

認証付きプロジェクトを追加する例:

```ts
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  {
    name: 'chromium-authenticated',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests/e2e/.auth/user.json',
    },
    dependencies: ['setup'],
  },
  { name: 'setup', testMatch: /global-setup\.ts/ },
]
```

## 優先実装済み

- **public-pages**: トップの Carousel（`data-testid="carousel-next"` / `carousel-previous`）、/boards の 2 画面分割カード（`data-testid="board-card-split"`）
- **board-editor**: モバイルでの「機材を追加」→ Drawer 表示、機材画像ジェネレーターのモーダル開閉・「機材画像を保存する」ボタン存在
