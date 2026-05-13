import { test, expect } from "@playwright/test";

test("renders local auth screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sign in to your workspace/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toHaveAttribute(
    "href",
    "/api/auth/start",
  );
});

