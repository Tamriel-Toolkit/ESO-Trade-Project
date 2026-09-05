/* Optional browser QA: npm install Playwright separately, or set PLAYWRIGHT_MODULE.
 * Start serve.cjs first. Uses an isolated headless browser, never a user profile.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = "http://127.0.0.1:5132";
const out = path.join(__dirname, "previews");
const screens = ["home", "marketplace", "characters"];
const failures = [];
let checks = 0;

async function assertFit(page, label) {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  assert.ok(
    dimensions.scroll <= dimensions.width,
    `${label}: page overflow ${JSON.stringify(dimensions)}`,
  );
  checks++;
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "chrome",
  });
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const concept of ["ledger", "atlas"]) {
      for (const width of [360, 390, 768, 1024, 1440]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          deviceScaleFactor: 1,
        });
        page.on("pageerror", (error) =>
          failures.push(`${concept}/${width}: ${error.message}`),
        );
        page.on("request", (request) => {
          if (!request.url().startsWith(base + "/"))
            failures.push(`Unexpected request: ${request.url()}`);
          if (request.method() !== "GET")
            failures.push(`Unexpected mutation: ${request.method()}`);
        });
        for (const screen of screens) {
          await page.goto(`${base}/${concept}.html?screen=${screen}`);
          await page
            .locator(`[data-screen="${screen}"]:not([hidden])`)
            .waitFor();
          await assertFit(page, `${concept}/${screen}/${width}`);
          if ([1440, 390].includes(width)) {
            await page.screenshot({
              path: path.join(
                out,
                `${concept}-${screen}-${width === 1440 ? "desktop" : "mobile"}.png`,
              ),
              fullPage: true,
              animations: "disabled",
            });
          }
        }
        await page.goto(`${base}/${concept}.html?screen=marketplace`);
        assert.equal(
          await page.locator("[data-listings] .listing-row").count(),
          9,
        );
        assert.equal(await page.locator("[data-category] option").count(), 9);
        assert.ok(await page.locator('[data-bar="back"]').count());
        await page.locator("[data-search]").fill("Tide-Born Feathers");
        assert.equal(
          await page.locator("[data-listings] .listing-row").count(),
          1,
        );
        await page.locator(".listing-row").focus();
        await page.keyboard.press("Enter");
        const dialog = page.locator("#item-detail");
        assert.equal(await dialog.evaluate((node) => node.open), true);
        const detail = await dialog.innerText();
        for (const text of ["2,100g", "210,000g", "300 items", "@wangpm001"])
          assert.ok(detail.includes(text), text);
        await page.keyboard.press("Tab");
        assert.equal(
          await page.evaluate(
            () =>
              document.activeElement === document.body ||
              Boolean(document.activeElement.closest("dialog")),
          ),
          true,
          "Tab must not focus background controls",
        );
        await page.keyboard.press("Escape");
        assert.equal(await dialog.evaluate((node) => node.open), false);
        assert.equal(
          await page.evaluate(() =>
            document.activeElement.matches(".listing-row"),
          ),
          true,
        );
        for (const state of ["loading", "empty", "error"]) {
          await page.locator("[data-state]").selectOption(state);
          assert.equal(await page.locator(".listing-row").count(), 0);
          assert.equal(
            await page.locator('[data-listings] [role="status"]').count(),
            1,
          );
        }
        await page.locator("[data-clear]").click();
        assert.equal(await page.locator(".listing-row").count(), 9);
        await page.locator("[data-category]").selectOption("Furnishings");
        assert.equal(await page.locator(".listing-row").count(), 1);
        assert.ok(
          (await page.locator(".listing-row").innerText()).includes("Firelogs"),
        );
        await page.goto(`${base}/${concept}.html?screen=characters`);
        assert.equal(await page.locator(".gear-row").count(), 11);
        await page.locator('[data-bar="back"]').click();
        assert.equal(await page.locator(".gear-row").count(), 11);
        assert.ok(
          (await page.locator(".gear-row").last().innerText()).includes(
            "Infused",
          ),
        );
        assert.equal(
          await page.locator('[data-bar="back"]').getAttribute("aria-pressed"),
          "true",
        );
        await page.goto(`${base}/${concept}.html?screen=home`);
        await page.locator('[data-filter-category="Furnishings"]').click();
        assert.equal(
          await page.locator("[data-category]").inputValue(),
          "Furnishings",
        );
        assert.equal(
          await page.evaluate(() => document.activeElement.tagName),
          "H1",
        );
        await page.close();
      }
      // Short/effective 2x desktop viewport. This is not a manual browser zoom audit.
      const short = await browser.newPage({
        viewport: { width: 720, height: 450 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
      });
      for (const screen of screens) {
        await short.goto(`${base}/${concept}.html?screen=${screen}`);
        await assertFit(short, `${concept}/${screen}/720x450`);
        assert.equal(
          await short.evaluate(() => document.getAnimations().length),
          0,
        );
      }
      await short.goto(`${base}/${concept}.html?screen=marketplace`);
      await short.locator(".listing-row").first().click();
      await short.locator("[data-close]").scrollIntoViewIfNeeded();
      const closeBox = await short.locator("[data-close]").boundingBox();
      assert.ok(
        closeBox.y >= 0 && closeBox.y + closeBox.height <= 450,
        "Short-viewport dialog action reachable",
      );
      await short.locator("[data-close]").click();
      await short.close();
    }
    const harness = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await harness.goto(base);
    await harness
      .frameLocator("#preview")
      .locator('.intro-actions [data-go="marketplace"]')
      .click();
    assert.equal(await harness.locator("#page").inputValue(), "marketplace");
    assert.ok(
      (await harness.locator("#open-preview").getAttribute("href")).includes(
        "screen=marketplace",
      ),
    );
    await harness.locator('[data-direction="atlas"]').click();
    await harness
      .frameLocator("#preview")
      .locator('[data-screen="marketplace"]:not([hidden])')
      .waitFor();
    await harness.locator("#viewport").selectOption("mobile");
    await harness.evaluate(() =>
      Promise.all(
        document.getAnimations().map((animation) => animation.finished),
      ),
    );
    assert.equal((await harness.locator("#preview").boundingBox()).width, 390);
    await harness.close();
    const blocked = await fetch(`${base}/../../package.json`);
    assert.equal(blocked.status, 404);
    const mutation = await fetch(base, { method: "POST" });
    assert.equal(mutation.status, 405);
    assert.deepEqual(failures, []);
    console.log(
      `PASS: ${checks} screen/viewport checks, 12 captures, both concepts' keyboard/search/category/dialog/bar/state controls, comparison harness, and server isolation.`,
    );
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
