import { expect, test } from "@playwright/test";

test.describe.skip("scanner recall workflow", () => {
  test("routes scanner input to the recall modal instead of the conveyor scanner", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /open scanner/i }).click();
    await page.getByRole("button", { name: /recall/i }).click();
    await page.keyboard.type("GARMENT-123");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/last scan: GARMENT-123/i)).toBeVisible();
  });
});
