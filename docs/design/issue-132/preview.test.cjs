const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
test("principal foreground/background palette pairs meet 4.5:1", () => {
  const luminance = (hex) => {
    const rgb = hex
      .match(/[0-9a-f]{2}/gi)
      .map((value) => parseInt(value, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const pairs = [
    ["Ledger ink", "#292a26", "#f5f2eb"],
    ["Ledger metadata", "#66695f", "#f5f2eb"],
    ["Ledger primary button", "#ffffff", "#763d37"],
    ["Ledger nav", "#c1c5b9", "#272c28"],
    ["Atlas ink", "#e9e7dc", "#101b1e"],
    ["Atlas metadata", "#91a5a1", "#18272b"],
    ["Atlas price", "#c1ae85", "#101b1e"],
    ["Atlas selection", "#9bc8bd", "#18272b"],
    ["Exchange ink", "#efe5cf", "#111214"],
    ["Exchange metadata", "#afa797", "#19191b"],
    ["Exchange gold", "#e6c15a", "#111214"],
  ];
  for (const [label, foreground, background] of pairs) {
    const levels = [luminance(foreground), luminance(background)].sort(
      (a, b) => b - a,
    );
    assert.ok((levels[0] + 0.05) / (levels[1] + 0.05) >= 4.5, label);
  }
});
test("reference snapshots preserve observed stack and unit-price distinctions", () => {
  const scope = { window: {} };
  vm.runInNewContext(read("fixtures.js"), scope);
  const data = scope.window.REVIEW_DATA;
  const feathers = data.listings.find(
    (item) => item.name === "Tide-Born Feathers",
  );
  assert.equal(feathers.price, 2100);
  assert.equal(feathers.quantity, 100);
  assert.equal(feathers.stacks, 3);
  assert.equal(feathers.price * feathers.quantity, 210000);
  assert.equal(feathers.stacks * feathers.quantity, 300);
  assert.equal(data.gear.length, 12);
  assert.equal(data.character.name, "Summonerofthedead");
  assert.match(data.provenance, /not live availability/);
});
test("preview code has no service, session, storage, or mutation integration", () => {
  const code = read("preview.js");
  for (const forbidden of [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /localStorage/,
    /sessionStorage/,
    /document\.cookie/,
    /api\/market/,
  ])
    assert.doesNotMatch(code, forbidden);
  assert.match(code, /textContent/);
  assert.match(code, /showModal/);
  new vm.Script(code);
});
for (const concept of ["ledger", "atlas", "exchange"]) {
  test(`${concept} exposes all three reference screens and the shared preview contract`, () => {
    const html = read(concept + ".html");
    const css = read(concept + ".css");
    for (const screen of ["home", "marketplace", "characters"])
      assert.match(html, new RegExp(`data-screen=["']${screen}["']`));
    for (const hook of [
      "data-listings",
      "data-gear",
      "data-categories",
      "data-detail-content",
      "data-close",
    ])
      assert.ok(html.includes(hook), hook);
    assert.match(html, /fixtures\.js/);
    assert.match(html, /preview\.js/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /:focus-visible/);
    assert.doesNotMatch(html, /<script[^>]+src=["']https?:/);
    assert.doesNotMatch(html, /<img[^>]+src=["']https?:/);
  });
}
test("comparison harness defaults to Exchange and validates shareable direction/screen values", () => {
  const html = read("index.html");
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, "comparison harness script exists");
  const createNode = () => ({
    attributes: {},
    events: {},
    classList: { toggle() {} },
    addEventListener(type, listener) { this.events[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  const runHarness = (query) => {
    const nodes = Object.fromEntries(
      ["page", "preview", "open-preview", "direction-name", "direction-copy", "viewport"]
        .map((name) => [name, createNode()]),
    );
    nodes.preview.contentWindow = {};
    const buttons = Array.from(html.matchAll(/data-direction="([a-z]+)"/g), ([, direction]) => ({
      ...createNode(), dataset: { direction },
    }));
    assert.deepEqual(buttons.map((button) => button.dataset.direction), ["ledger", "atlas", "exchange"]);
    const location = new URL("http://127.0.0.1:5132/" + query);
    const window = createNode();
    vm.runInNewContext(script[1], {
      URL, URLSearchParams, location, window,
      history: { replaceState(_state, _title, url) { location.href = url.href; } },
      document: {
        getElementById: (name) => nodes[name],
        querySelectorAll: (selector) => {
          assert.equal(selector, "[data-direction]");
          return buttons;
        },
      },
    });
    return { nodes, buttons, location, window };
  };
  for (const [query, direction, screen] of [
    ["", "exchange", "home"],
    ["?direction=exchange&screen=marketplace", "exchange", "marketplace"],
    ["?direction=ledger&screen=characters", "ledger", "characters"],
    ["?direction=constructor&screen=../../package.json", "exchange", "home"],
    ["?direction=https://example.com&screen=invalid", "exchange", "home"],
  ]) {
    const { nodes, buttons, location } = runHarness(query);
    assert.equal(nodes.preview.src, `${direction}.html?screen=${screen}`);
    assert.equal(nodes["open-preview"].href, nodes.preview.src);
    assert.equal(nodes.page.value, screen);
    assert.equal(location.searchParams.get("direction"), direction);
    assert.equal(location.searchParams.get("screen"), screen);
    for (const button of buttons)
      assert.equal(button.attributes["aria-pressed"], String(button.dataset.direction === direction));
  }
  const { nodes, buttons, window, location } = runHarness("?direction=exchange&screen=marketplace");
  buttons.find((button) => button.dataset.direction === "atlas").events.click();
  assert.equal(nodes.preview.src, "atlas.html?screen=marketplace");
  const message = {
    origin: location.origin,
    source: nodes.preview.contentWindow,
    data: { type: "design-review-screen", screen: "characters" },
  };
  for (const invalid of [
    { ...message, origin: "https://example.com" },
    { ...message, source: {} },
    { ...message, data: { type: "unrecognized", screen: "characters" } },
    { ...message, data: { type: "design-review-screen", screen: "invalid" } },
  ]) {
    window.events.message(invalid);
    assert.equal(nodes.page.value, "marketplace");
  }
  window.events.message(message);
  assert.equal(nodes.page.value, "characters");
  assert.equal(nodes["open-preview"].href, "atlas.html?screen=characters");
  assert.equal(location.searchParams.get("screen"), "characters");
});
test("icon mappings match reference identities and cached assets, with only the documented fallback", () => {
  const scope = { window: {} };
  vm.runInNewContext(read("fixtures.js"), scope);
  vm.runInNewContext(read("icon-data.js"), scope);
  const data = scope.window.REVIEW_DATA;
  const icons = scope.window.REVIEW_ICONS;
  const manifest = JSON.parse(read("assets/icon-manifest.json"));
  const sorted = (values) => Array.from(values).sort();
  assert.deepEqual(sorted(Object.keys(icons.listings)), sorted(data.listings.map((item) => item.name)));
  assert.deepEqual(sorted(Object.keys(icons.gear)), sorted(data.gear.map((item) => item.slot)));
  assert.deepEqual(sorted(manifest.listings.map((item) => item.name)), sorted(Object.keys(icons.listings)));
  assert.deepEqual(sorted(manifest.gear.map((item) => item.slot)), sorted(Object.keys(icons.gear)));
  assert.equal(manifest.listings.filter((item) => item.cached).length, 8);
  assert.deepEqual(manifest.listings.filter((item) => !item.cached).map((item) => item.name), ["Firelogs, Flaming"]);
  assert.equal(manifest.fallback.filename, "item-icon-fallback.svg");
  assert.equal(manifest.fallback.source, "backend/assets/item-icon-fallback.svg");
  const assertAsset = (filename) => {
    assert.match(filename, /^[a-z0-9_-]+\.(png|svg)$/i);
    const bytes = fs.readFileSync(path.join(__dirname, "assets", filename));
    assert.ok(bytes.length > 0, `${filename} is present and nonempty`);
    if (filename.endsWith(".png"))
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${filename} is a PNG`);
    else assert.match(bytes.toString("utf8"), /<svg\b/);
  };
  for (const item of manifest.listings) {
    const expected = item.cached ? item.filename : manifest.fallback.filename;
    assert.equal(icons.listings[item.name], expected, item.name);
    assertAsset(expected);
  }
  for (const item of manifest.gear) {
    assert.equal(data.gear.find((gear) => gear.slot === item.slot).name, item.name);
    assert.equal(icons.gear[item.slot], item.filename, item.slot);
    assertAsset(item.filename);
  }
});
