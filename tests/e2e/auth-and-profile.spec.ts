import { test, expect } from "@playwright/test";

/**
 * 認証・プロフィール・所持機材のE2Eテスト
 * ログイン、プロフィール編集、所有機材の追加・D&D並び替え
 * 認証は globalSetup のセッション保存または page.route によるAPIモックを想定
 */
test.describe("Auth and profile", () => {
  test.describe.configure({ mode: "serial" });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /ログイン|サインイン/ })).toBeVisible();
  });

  test("ログイン後、プロフィール編集が可能", async ({ page }) => {
    // TODO: 認証セッションまたはAPIモックでログイン状態を用意
    test.skip(true, "認証セットアップ後に実装");
  });

  test("プロフィール編集で表示名を変更できる", async ({ page }) => {
    test.skip(true, "認証セットアップ後に実装");
  });

  test("所持機材を追加できる", async ({ page }) => {
    test.skip(true, "認証セットアップ後に実装");
  });

  test("所持機材をD&Dで並び替えできる", async ({ page }) => {
    test.skip(true, "認証セットアップ後に実装");
  });
});
