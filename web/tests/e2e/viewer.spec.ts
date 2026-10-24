import { test, expect } from "@playwright/test";

const SHOTS = "../docs/screenshots";

test.describe("3D treatment-scenario viewer smoke", () => {
  test("loads with the heart organ and the cohort notice", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /3D treatment scenarios/i })).toBeVisible();
    await expect(page.getByText(/not a medical device/i)).toBeVisible();
    await expect(page.getByText(/SYNTHETIC example/i)).toBeVisible();
    // side-by-side default shows two canvases
    const split = page.getByTestId("viewer-side-by-side");
    await expect(split).toBeVisible();
    await expect(split.locator("canvas")).toHaveCount(2);
    await page.screenshot({ path: `${SHOTS}/heart-side-by-side.png`, fullPage: true });
  });

  test("toggles an intervention and shows a contributor in the table", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator("button.toggle", { hasText: "ACE inhibitor / ARB" });
    await expect(btn).toBeEnabled();
    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    // treated column should now name the contributor
    await expect(page.locator(".param-table .contrib")).toContainText(/ACE inhibitor \/ ARB/);
  });

  test("switches to ghost overlay (single canvas)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Ghost overlay$/ }).click();
    const ghost = page.getByTestId("viewer-ghost");
    await expect(ghost).toBeVisible();
    await expect(ghost.locator("canvas")).toHaveCount(1);
    await page.screenshot({ path: `${SHOTS}/heart-ghost.png`, fullPage: true });
  });

  test("switches organ to Brain and renders the brain parameters", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Brain$/ }).click();
    await expect(page.getByText(/Hippocampal volume/i)).toBeVisible();
    await expect(page.getByTestId("viewer-side-by-side").locator("canvas")).toHaveCount(2);
    await page.screenshot({ path: `${SHOTS}/brain-side-by-side.png`, fullPage: true });
  });

  test("aortic stenosis shows the info card and no toggles", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Aortic stenosis$/ }).click();
    await expect(page.getByText(/No proven medication slows aortic stenosis/i)).toBeVisible();
    await expect(page.getByText(/ACC\/AHA 2020/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ACE inhibitor/i })).toHaveCount(0);
  });

  test("suggested interventions are highlighted via ?suggest=", async ({ page }) => {
    await page.goto("/?suggest=ace_inhibitor_arb");
    const btn = page.locator("button.toggle", { hasText: "ACE inhibitor / ARB" });
    await expect(btn).toHaveClass(/suggested/);
  });

  test("shows a graceful fallback when WebGL is unavailable", async ({ browser }) => {
    // New context with WebGL disabled by stubbing getContext for webgl types.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (id: string, ...a: unknown[]) => unknown;
      };
      const orig = proto.getContext.bind(proto);
      proto.getContext = function (id: string, ...args: unknown[]) {
        if (id === "webgl" || id === "webgl2" || id === "experimental-webgl") return null;
        return orig(id, ...args);
      };
    });
    await page.goto("/");
    await expect(page.getByTestId("webgl-fallback")).toBeVisible();
    // Table still works
    await expect(page.getByText(/Projected parameters/i)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/webgl-fallback.png`, fullPage: true });
    await context.close();
  });
});
