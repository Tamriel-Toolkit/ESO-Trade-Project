// Read-only UI regression check. Use a copied-data review API, never the user's API.
// PLAYWRIGHT_MODULE / PLAYWRIGHT_CHROMIUM_EXECUTABLE select an installed modern runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const app = new URL(process.env.ESOTRADE_REVIEW_URL || 'http://127.0.0.1:5174');
const api = new URL(process.env.ESOTRADE_REVIEW_API || 'http://127.0.0.1:5012');
for (const url of [app, api]) assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Loopback review only');
assert.notEqual(api.port, '5001', 'Do not use the user API');
const screenshots = process.argv.includes('--screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
  const errors = [], blocked = [], checks = [];
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (![app.origin, api.origin].includes(url.origin) || !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || url.pathname === '/api/items') {
        blocked.push({ path: url.pathname, method: request.method() });
        return route.abort();
      }
      if (url.origin === api.origin && url.pathname === '/api/auth/me') return route.fulfill({ status: 200, json: { success: false, user: null } });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const [width, height] of [[1440, 1000], [390, 844], [360, 780], [768, 1024], [1024, 768], [720, 450]]) {
      await page.setViewportSize({ width, height });
      await page.goto(app.origin + '/marketplace?view=catalog&search=Tide-Born%20Feathers&category=Materials&quality=1');
      await page.waitForLoadState('networkidle');
      assert.equal(await page.getByRole('heading', { name: 'Marketplace', exact: true }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Item catalog', exact: true }).count(), 0);
      const query = new URL(page.url()).searchParams;
      assert.notEqual(query.get('view'), 'catalog');
      assert.equal(query.get('search'), 'Tide-Born Feathers');
      assert.equal(query.get('category'), 'Materials');
      assert.equal(query.get('quality'), '1');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.keyboard.press('Tab'); // Establish keyboard modality before programmatic focus.
      const fields = page.locator('.exchange-market-refine select');
      assert.equal(await fields.count(), 8, 'Every existing listing refinement remains available');
      for (const field of await fields.all()) {
        if (!(await field.isEnabled())) continue;
        await field.focus();
        const metrics = await field.evaluate(select => {
          const group = select.closest('.exchange-field') || select.closest('[data-slot="native-select-wrapper"]').parentElement;
          const label = group.querySelector(':scope > span');
          const style = getComputedStyle(select), rect = select.getBoundingClientRect();
          return { name: select.getAttribute('aria-label'), keyboardFocus: select.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineOffset: parseFloat(style.outlineOffset), gap: rect.top - label.getBoundingClientRect().bottom };
        });
        assert.equal(metrics.keyboardFocus, true);
        assert.notEqual(metrics.outlineStyle, 'none');
        assert.ok(metrics.outlineWidth >= 2, 'Focus remains visible');
        assert.ok(metrics.gap >= metrics.outlineWidth + metrics.outlineOffset + 2, `${metrics.name}: label/focus overlap ${JSON.stringify(metrics)}`);
        checks.push({ width, height, ...metrics });
      }
      if (screenshots && [1440, 390].includes(width)) {
        await page.getByRole('combobox', { name: 'Quality', exact: true }).focus();
        await page.locator('.exchange-market-refine').screenshot({ path: path.join(__dirname, `previews/followup-filter-focus-${width}.png`), animations: 'disabled' });
        await page.screenshot({ path: path.join(__dirname, `previews/followup-listings-only-${width}.png`), animations: 'disabled', fullPage: true });
      }
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(app.origin); await page.waitForLoadState('networkidle');
      assert.equal(await page.getByText(/catalog/i).count(), 0, 'Home does not promote retired feature');
      assert.ok((await page.locator('.exchange-category-grid a').count()) > 0);
      if (screenshots) await page.screenshot({ path: path.join(__dirname, `previews/followup-home-${width}.png`), fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      assert.equal(await page.getByText(/catalog/i).count(), 0, 'Settings has no obsolete catalog count');
      assert.equal(await page.getByText('Latest scan', { exact: true }).count(), 1);
      if (screenshots) await page.screenshot({ path: path.join(__dirname, `previews/followup-settings-${width}.png`), animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
    assert.equal(errors.length, 0, 'No page errors');
    assert.equal(blocked.length, 0, 'No catalog browser queries, writes, or out-of-scope requests');
    console.log(JSON.stringify({ browser: await browser.version(), focusChecks: checks.length, minimumGap: Math.min(...checks.map(check => check.gap)), routeWidths: [1440, 390, 360, 768, 1024, 720], errors, blocked }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
