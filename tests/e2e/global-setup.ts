/**
 * E2E 用 globalSetup（任意）
 * 認証セッションを保存して authenticated プロジェクトで再利用する場合に使用。
 * 使用する場合は playwright.config.ts の globalSetup を有効化してください。
 */
import type { FullConfig } from "@playwright/test";

async function globalSetup(_config: FullConfig) {
  // 例: ログインして storageState を保存
  // const { page } = await _config.projects[0].use;
  // await page.goto('/login');
  // ... ログイン操作 ...
  // await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
}

export default globalSetup;
