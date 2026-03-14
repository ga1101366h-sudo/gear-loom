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
    await page.goto("/board/editor");
    await expect(page.getByRole("heading", { name: /エフェクターボードエディタ/ })).toBeVisible();

    // デスクトップ: サイドバーの「機材を追加」で設定モーダルを開く
    const sidebarAddButton = page.getByRole("button", { name: "機材を追加" }).first();
    await sidebarAddButton.click();
    const settingsModal = page.getByRole("heading", { name: /機材の設定/ });
    await expect(settingsModal).toBeVisible();

    const openGeneratorButton = page.getByRole("button", { name: "画像を追加する（AI自動切り抜き）" }).first();
    await openGeneratorButton.click();

    const generatorModal = page.getByTestId("gear-image-generator-modal").first();
    await expect(generatorModal).toBeVisible();

    const closeButton = generatorModal.getByRole("button", { name: "閉じる" });
    await closeButton.click();
    await expect(generatorModal).not.toBeVisible();
  });

  test("機材画像ジェネレーター内に「機材画像を保存する」ボタンが存在する", async ({ page }) => {
    await page.goto("/board/editor");
    const sidebarAddButton = page.getByRole("button", { name: "機材を追加" }).first();
    await sidebarAddButton.click();
    const openGeneratorButton = page.getByRole("button", { name: "画像を追加する（AI自動切り抜き）" }).first();
    await openGeneratorButton.click();
    const generatorModal = page.getByTestId("gear-image-generator-modal").first();
    await expect(generatorModal).toBeVisible();
    await expect(generatorModal.getByRole("button", { name: "機材画像を保存する" })).toBeVisible();
    // 「保存」押下でモーダルが閉じる検証は、page.route で POST /api/gears/upload をモックし、
    // 認証＋所持機材ノードから開いて画像アップロード後に実装可能
  });

  test("React Flowキャンバスにノードを追加できる（デスクトップ）", async ({ page }) => {
    test.skip(true, "認証・所持機材データ後に実装");
  });

  test("スマホ用ドロワーからタップでノードを追加できる", async ({ page }) => {
    test.skip(true, "認証・所持機材データ後に実装");
  });
});
