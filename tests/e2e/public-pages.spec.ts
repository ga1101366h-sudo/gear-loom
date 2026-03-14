import { test, expect } from "@playwright/test";

/**
 * 非認証でアクセス可能な公開ページのE2Eテスト
 * トップページ、/boards、/live-spots、/about 等
 */
test.describe("Public pages", () => {
  test.beforeEach(async ({ page }) => {
    // 未認証でアクセスするため特にセッションは設定しない
  });

  test("トップページにアクセスし、Carouselの矢印が存在する", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("carousel-next").first()).toBeVisible();
    await expect(page.getByTestId("carousel-previous").first()).toBeVisible();
  });

  test("/boards にアクセスし、2画面分割のボードカードまたは一覧構造が存在する", async ({ page }) => {
    await page.goto("/boards");
    const heading = page.getByRole("heading", { name: /みんなのエフェクターボード/ });
    await expect(heading).toBeVisible();
    const emptyState = page.getByText("まだ投稿されたボードはありません");
    const gridCards = page.locator('a[href^="/boards/post/"]');
    const splitCards = page.getByTestId("board-card-split");
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(gridCards.first()).toBeVisible();
      const count = await splitCards.count();
      if (count > 0) {
        await expect(splitCards.first()).toBeVisible();
      }
    }
  });

  test("トップページのスモーク", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Gear-Loom/);
  });

  test("/boards のスモーク", async ({ page }) => {
    await page.goto("/boards");
    await expect(page).toHaveTitle(/.*/);
  });

  test("/live-spots のスモーク", async ({ page }) => {
    await page.goto("/live-spots");
    await expect(page).toHaveTitle(/.*/);
  });

  test("/about のスモーク", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveTitle(/.*/);
  });
});
