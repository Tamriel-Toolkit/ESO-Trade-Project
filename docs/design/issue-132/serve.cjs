/* Optional, local-only preview server. No dependencies, writes, or application APIs. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const allowed = new Set([
  "index.html",
  "ledger.html",
  "atlas.html",
  "ledger.css",
  "atlas.css",
  "fixtures.js",
  "preview.js",
  "exchange.html",
  "exchange.css",
  "icon-data.js",
  "assets/ui-icons.svg",
  "assets/cinzel-latin-400-normal.woff2",
  "assets/cinzel-latin-600-normal.woff2",
]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "assets/icon-manifest.json"), "utf8"),
);
const icons = new Set([
  manifest.fallback.filename,
  ...manifest.listings
    .filter((item) => item.cached)
    .map((item) => item.filename),
  ...manifest.gear.map((item) => item.filename),
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
http
  .createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }
    let filename =
      new URL(request.url, "http://localhost").pathname.slice(1) ||
      "index.html";
    const iconName = filename.startsWith("api/icons/")
      ? filename.slice("api/icons/".length)
      : null;
    if (iconName && icons.has(iconName)) filename = "assets/" + iconName;
    else if (!allowed.has(filename)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    fs.readFile(path.join(root, filename), (error, content) => {
      if (error) {
        response.writeHead(404);
        response.end("Preview not ready");
        return;
      }
      response.writeHead(200, {
        "Content-Type": types[path.extname(filename)],
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    });
  })
  .listen(Number(process.env.PREVIEW_PORT) || 5132, "127.0.0.1", () =>
    console.log(
      "Issue 132 review: http://127.0.0.1:" +
        (Number(process.env.PREVIEW_PORT) || 5132),
    ),
  );
