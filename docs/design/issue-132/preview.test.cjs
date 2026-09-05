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
for (const concept of ["ledger", "atlas"]) {
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
  });
}
