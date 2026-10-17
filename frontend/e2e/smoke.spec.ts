import { expect, test } from "@playwright/test";

test("home renders with a title and an h1", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Stadtlöwe/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("navigates to the contact page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Kontakt", exact: true }).first().click();

  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Kontakt aufnehmen/i }),
  ).toBeVisible();
});

test("unknown routes are not-found and noindex", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page).toHaveTitle(/nicht gefunden/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("the admin area is noindex", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("<urlset");
});
