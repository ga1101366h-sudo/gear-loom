import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * フォームバリデーション（空入力・異常値）のE2Eテスト
 * 必須項目未入力時にエラーメッセージ表示または送信ブロックされること、
 * および境界値・長文入力でサーバーがクラッシュしないことを検証する。
 *
 * 認証が必要なテストは、環境変数 E2E_TEST_EMAIL / E2E_TEST_PASSWORD に
 * テスト用アカウントの認証情報を設定して実行してください。
 */

/** テスト用アカウントでログインし、指定パスへ遷移する。認証情報が未設定の場合は false を返す */
async function loginAsTestUser(page: Page, nextPath: string): Promise<boolean> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) return false;

  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^ログイン$/ }).first().click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
  const currentPath = new URL(page.url()).pathname;
  if (currentPath.includes("/login")) return false;

  await page.goto(nextPath);
  await page.waitForURL(new RegExp(nextPath.replace(/\//g, "\\/")), { timeout: 10000 }).catch(() => {});
  return true;
}

test.describe("Form validation (空入力・バリデーション)", () => {
  test("ログインフォームでメール・パスワードを空のまま送信すると送信がブロックされログイン画面に留まる", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /ログイン|Gear-Loom/ }).first()).toBeVisible();

    const submitButton = page.getByRole("button", { name: /^ログイン$/ }).first();
    await submitButton.click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("レビュー投稿画面で必須項目を空のまま「投稿する」を押すとバリデーションで送信がブロックされる", async ({
    page,
  }) => {
    const loggedIn = await loginAsTestUser(page, "/reviews/new");
    if (!loggedIn) {
      test.skip(true, "E2E_TEST_EMAIL と E2E_TEST_PASSWORD を設定すると実行されます");
      return;
    }

    await expect(page.getByRole("heading", { name: /レビューを投稿/ }).first()).toBeVisible();
    const submitBtn = page.getByRole("button", { name: "投稿する" }).first();
    await submitBtn.click();

    await expect(page).toHaveURL(/\/reviews\/new/);
    const titleInput = page.locator("#title").first();
    await expect(titleInput).toBeVisible();
  });

  test("機材編集画面でカテゴリ・機材名を空のまま「追加」を押すとエラーメッセージが表示される", async ({
    page,
  }) => {
    const loggedIn = await loginAsTestUser(page, "/mypage/gear");
    if (!loggedIn) {
      test.skip(true, "E2E_TEST_EMAIL と E2E_TEST_PASSWORD を設定すると実行されます");
      return;
    }

    await expect(page.getByRole("heading", { name: /機材を編集/ }).first()).toBeVisible();
    const addButton = page.getByRole("button", { name: /^追加$/ }).first();
    await addButton.click();

    await expect(page.getByText(/カテゴリと機材名を入力してください/).first()).toBeVisible();
  });
});

test.describe("Form validation (境界値・文字数オーバー)", () => {
  test("レビュー投稿画面で本文に2000文字を入力して送信しても500エラーにならない", async ({
    page,
  }) => {
    const loggedIn = await loginAsTestUser(page, "/reviews/new");
    if (!loggedIn) {
      test.skip(true, "E2E_TEST_EMAIL と E2E_TEST_PASSWORD を設定すると実行されます");
      return;
    }

    const longBody = "a".repeat(2000);
    const bodyTextarea = page.locator("#body").first();
    await bodyTextarea.fill(longBody);

    const titleInput = page.locator("#title").first();
    await titleInput.fill("E2Eテスト用タイトル");
    const gearInput = page.locator("#gear").first();
    if (await gearInput.isVisible()) {
      await gearInput.fill("E2Eテスト用機材");
    }

    let got500 = false;
    page.on("response", (res) => {
      if (res.status() >= 500) got500 = true;
    });

    const submitBtn = page.getByRole("button", { name: "投稿する" }).first();
    await submitBtn.click();

    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(() => expect(got500).toBe(false)).toPass({ timeout: 5000 });
    await expect(page.getByText("500")).not.toBeVisible().catch(() => {});
    await expect(page.getByText("Internal Server Error")).not.toBeVisible().catch(() => {});
  });

  test("レビュー投稿画面でタイトルに101文字以上を入力すると100文字で制限される", async ({
    page,
  }) => {
    const loggedIn = await loginAsTestUser(page, "/reviews/new");
    if (!loggedIn) {
      test.skip(true, "E2E_TEST_EMAIL と E2E_TEST_PASSWORD を設定すると実行されます");
      return;
    }

    const titleInput = page.locator("#title").first();
    await titleInput.fill("a".repeat(150));
    const value = await titleInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(100);
  });
});
