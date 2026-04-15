import { test, expect } from "@playwright/test";

/**
 * ボードエディタのE2Eテスト
 * React Flowキャンバス、スマホ用ドロワー、AI画像ジェネレーター
 */
test.describe("Board editor", () => {
  test("エディタページにアクセスする", async ({ page }) => {
    await page.goto("/board/editor");
    await expect(page.getByRole("heading", { name: /エフェクターボードエディタ/ })).toBeVisible();
  });

  test("モバイルビューで「機材を追加」フローティングボタンからDrawerが開く", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/board/editor");
    const addButton = page.getByRole("button", { name: "機材を追加" }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    const drawer = page.getByRole("dialog", { name: "機材を追加" }).first();
    await expect(drawer).toBeVisible();
  });

  test("機材画像ジェネレーターのモーダルを開き、閉じるボタンでモーダルがDOMから消える", async ({ page }) => {
    // 機材ノードの設定モーダルから開くフローのため、認証＋所持機材データが必要
    test.skip(true, "認証セットアップ後に実装");
  });

  test("機材画像ジェネレーター内に「機材画像を保存する」ボタンが存在する", async ({ page }) => {
    // 機材ノードの設定モーダルから開くフローのため、認証＋所持機材データが必要
    test.skip(true, "認証セットアップ後に実装");
  });

  test("React Flowキャンバスにノードを追加できる（デスクトップ）", async ({ page }) => {
    test.skip(true, "認証・所持機材データ後に実装");
  });

  test("スマホ用ドロワーからタップでノードを追加できる", async ({ page }) => {
    test.skip(true, "認証・所持機材データ後に実装");
  });
});
