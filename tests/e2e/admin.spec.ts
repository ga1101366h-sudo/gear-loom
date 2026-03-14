import { test, expect } from "@playwright/test";

/**
 * 管理者画面のE2Eテスト
 * アクセス制限、ユーザーリスト表示
 */
test.describe("Admin", () => {
  test("未認証で /admin にアクセスするとログインへリダイレクトされる", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("管理者でログインすると /admin でユーザーリストが表示される", async ({ page }) => {
    test.skip(true, "管理者認証セットアップ後に実装");
  });
});
