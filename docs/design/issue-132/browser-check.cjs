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
const concepts = ["ledger", "atlas", "exchange"];
const iconManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "assets/icon-manifest.json"), "utf8"),
);
const listingIcons = iconManifest.listings.map((item) =>
  item.cached ? item.filename : iconManifest.fallback.filename,
);
const gearIcons = (bar) =>
  iconManifest.gear
    .filter(
      (item) => item.slot !== (bar === "front" ? "Back bar" : "Front bar"),
    )
    .map((item) => item.filename);
const feathersIcon = iconManifest.listings.find(
  (item) => item.name === "Tide-Born Feathers",
).filename;
const homeIcons = [
  iconManifest.listings.find((item) => item.name === "Deadly Ring").filename,
  iconManifest.gear.find((item) => item.slot === "Front bar").filename,
  feathersIcon,
];
const failures = [];
let checks = 0;

function auditPage(page, label) {
  page.on("pageerror", (error) => failures.push(`${label}: ${error.message}`));
  page.on("request", (request) => {
    if (!request.url().startsWith(base + "/"))
      failures.push(`${label}: unexpected request ${request.url()}`);
    if (request.method() !== "GET")
      failures.push(`${label}: unexpected mutation ${request.method()}`);
  });
}

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

async function assertIcons(page, selector, expectedFilenames, label) {
  const icons = page.locator(selector);
  assert.equal(
    await icons.count(),
    expectedFilenames.length,
    `${label}: icon count`,
  );
  for (const [index, icon] of (await icons.all()).entries()) {
    await icon.scrollIntoViewIfNeeded();
    await icon.evaluate(async (image) => {
      if (!image.complete) {
        await new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }
    });
    assert.equal(await icon.isVisible(), true, `${label}: icon is visible`);
    assert.equal(
      await icon.getAttribute("src"),
      "/api/icons/" + encodeURIComponent(expectedFilenames[index]),
      `${label}: final icon must retain its expected identity, not an unexpected fallback`,
    );
    assert.equal(
      await icon.evaluate((image) => image.complete && image.naturalWidth > 0),
      true,
      `${label}: expected icon loaded successfully`,
    );
  }
  await page.evaluate(() => scrollTo(0, 0));
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "chrome",
  });
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const concept of concepts) {
      for (const width of [360, 390, 768, 1024, 1440]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          deviceScaleFactor: 1,
        });
        auditPage(page, `${concept}/${width}`);
        for (const screen of screens) {
          await page.goto(`${base}/${concept}.html?screen=${screen}`);
          await page
            .locator(`[data-screen="${screen}"]:not([hidden])`)
            .waitFor();
          await assertFit(page, `${concept}/${screen}/${width}`);
          if (concept === "exchange" && screen === "marketplace") {
            await assertIcons(
              page,
              "[data-listings] .item-icon img",
              listingIcons,
              `${concept}/${screen}/${width}`,
            );
          }
          if (concept === "exchange" && screen === "characters") {
            await assertIcons(
              page,
              "[data-gear] .gear-icon img",
              gearIcons("front"),
              `${concept}/${screen}/${width}`,
            );
          }
          if (concept === "exchange" && screen === "home") {
            await assertIcons(
              page,
              ".wares-display img",
              homeIcons,
              `${concept}/${screen}/${width}`,
            );
          }
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
        if (concept === "exchange") {
          await assertIcons(
            page,
            ".detail-item-icon img",
            [feathersIcon],
            `${concept}/detail/${width}`,
          );
        }
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
        if (concept === "exchange") {
          await page.locator(".listing-row").click();
          await assertIcons(
            page,
            ".detail-item-icon img",
            [iconManifest.fallback.filename],
            `${concept}/fallback-detail/${width}`,
          );
          await page.locator("[data-close]").click();
        }
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
        if (concept === "exchange") {
          await assertIcons(
            page,
            "[data-gear] .gear-icon img",
            gearIcons("back"),
            `${concept}/back-bar/${width}`,
          );
        }
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
      auditPage(short, `${concept}/720x450/reduced-motion`);
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
    auditPage(harness, "comparison harness");
    await harness.goto(base);
    assert.equal(
      await harness
        .locator('[data-direction="exchange"]')
        .getAttribute("aria-pressed"),
      "true",
      "The new Exchange direction is the default",
    );
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
    assert.equal(
      new URL(harness.url()).searchParams.get("screen"),
      "marketplace",
    );
    for (const concept of concepts) {
      await harness.locator(`[data-direction="${concept}"]`).click();
      await harness
        .frameLocator("#preview")
        .locator('[data-screen="marketplace"]:not([hidden])')
        .waitFor();
      assert.equal(
        await harness.locator("#open-preview").getAttribute("href"),
        `${concept}.html?screen=marketplace`,
      );
      assert.equal(
        new URL(harness.url()).searchParams.get("direction"),
        concept,
      );
    }
    await harness.locator("#viewport").selectOption("mobile");
    await harness.evaluate(() =>
      Promise.all(
        document.getAnimations().map((animation) => animation.finished),
      ),
    );
    assert.equal((await harness.locator("#preview").boundingBox()).width, 390);
    await harness.goto(`${base}/?direction=exchange&screen=marketplace`);
    assert.equal(await harness.locator("#page").inputValue(), "marketplace");
    assert.equal(
      await harness.locator("#preview").getAttribute("src"),
      "exchange.html?screen=marketplace",
      "Whitelisted deep links select the expected direction and screen",
    );
    await harness.goto(
      `${base}/?direction=constructor&screen=../../package.json`,
    );
    assert.equal(
      await harness.locator("#preview").getAttribute("src"),
      "exchange.html?screen=home",
      "Unknown direction and screen values fall back to safe defaults",
    );
    await harness.close();
    const blocked = await fetch(`${base}/../../package.json`);
    assert.equal(blocked.status, 404);
    const mutation = await fetch(base, { method: "POST" });
    assert.equal(mutation.status, 405);
    assert.deepEqual(failures, []);
    console.log(
      `PASS: ${checks} screen/viewport checks, ${concepts.length * screens.length * 2} captures, all three concepts' keyboard/search/category/dialog/bar/state controls, exact Exchange icon identities (8 cached listing originals and the documented Firelogs fallback, gear, home, and details), comparison harness/deep links, all-page error/network audits, and server isolation.`,
    );
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
