import { test, expect } from "@playwright/test";

/**
 * 認証ガード（未ログイン保護）のE2Eテスト
 * 未ログインユーザーがプライベートなページに直接アクセスした場合、
 * ログイン画面またはトップへリダイレクトされることを検証する。
 */
test.describe("Auth guards (未ログイン保護)", () => {
  test.beforeEach(async ({ page }) => {
    // セッションなし（未ログイン状態）で検証するため、ストレージはクリアしないが
    // 新規コンテキストで baseURL から開始する想定
  });

  test("未ログインで /mypage に直接アクセスするとログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/mypage");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain("next=");
    expect(page.url()).toMatch(/next=.*mypage/);
  });

  test("未ログインで /mypage/gear（機材編集）に直接アクセスするとログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/mypage/gear");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toMatch(/next=.*mypage%2Fgear|next=.*mypage\/gear/);
  });

  test("未ログインで /reviews/new（レビュー投稿）に直接アクセスするとログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/reviews/new");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toMatch(/next=.*reviews/);
  });

  test("未ログインで /profile に直接アクセスするとログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
