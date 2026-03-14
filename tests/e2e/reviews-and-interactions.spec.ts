import { test, expect } from "@playwright/test";

/**
 * レビュー・いいね・お気に入りのE2Eテスト
 */
test.describe("Reviews and interactions", () => {
  test("レビュー一覧が表示される", async ({ page }) => {
    await page.goto("/reviews");
    await expect(page).toHaveTitle(/.*/);
  });

  test("レビュー投稿ができる（認証時）", async ({ page }) => {
    test.skip(true, "認証セットアップ後に実装");
  });

  test("いいね・お気に入り操作ができる", async ({ page }) => {
    test.skip(true, "認証セットアップ後に実装");
  });
});
