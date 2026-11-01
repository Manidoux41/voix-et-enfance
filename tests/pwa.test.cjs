const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");

function manifest() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root, "src/app/manifest.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { exports });
  return exports.default();
}

test("le manifeste cible l’application autonome et ses icones PNG valides", async () => {
  const app = manifest();
  assert.equal(app.start_url, "/");
  assert.equal(app.scope, "/");
  assert.equal(app.display, "standalone");
  assert.equal(app.lang, "fr");
  for (const icon of app.icons) {
    const metadata = await sharp(path.join(root, "public", icon.src)).metadata();
    assert.equal(metadata.format, "png");
    assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes);
  }
  assert.ok(app.icons.some(icon => icon.purpose === "maskable"));
  const apple = await sharp(path.join(root, "public/icons/apple-touch-icon.png")).metadata();
  assert.equal(apple.width, 180);
  assert.equal(apple.height, 180);
});

function worker(fetchImpl) {
  const handlers = {};
  const calls = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/sw.js"), "utf8"), {
    self: {
      location: { origin: "https://site.example" },
      addEventListener: (event, handler) => { handlers[event] = handler; },
      skipWaiting: async () => { calls.push("skipWaiting"); },
      clients: { claim: async () => { calls.push("claim"); } },
    },
    URL, Response,
    fetch: fetchImpl,
    caches: new Proxy({}, { get: () => { throw new Error("Le service worker ne doit jamais utiliser un cache."); } }),
  });
  return { handlers, calls };
}

test("le service worker s’active sans cache et ne traite aucune route privee ou API", async () => {
  const { handlers, calls } = worker(() => { throw new Error("Unexpected fetch"); });
  await handlers.install({ waitUntil: promise => promise });
  await handlers.activate({ waitUntil: promise => promise });
  assert.deepEqual(calls, ["skipWaiting", "claim"]);
  for (const url of ["/admin", "/admin/activate", "/api/signatories", "/api/admin/export/pdf", "/api/documents/pdf", "/documents/test.pdf"]) {
    handlers.fetch({
      request: { url: `https://site.example${url}`, method: "GET", mode: "navigate" },
      respondWith: () => { throw new Error(`Route non publique interceptée : ${url}`); },
    });
  }
  handlers.fetch({
    request: { url: "https://other.example/installer", method: "GET", mode: "navigate" },
    respondWith: () => { throw new Error("Origine externe interceptée"); },
  });
});

test("une navigation publique preserve la reponse reseau ou affiche une erreur hors ligne", async () => {
  const online = new Response("public-page", { status: 200 });
  const fixture = worker(async () => online);
  let response;
  fixture.handlers.fetch({
    request: { url: "https://site.example/signer", method: "GET", mode: "navigate" },
    respondWith: promise => { response = promise; },
  });
  assert.equal(await response, online);
  const offline = worker(async () => { throw new Error("offline"); });
  offline.handlers.fetch({
    request: { url: "https://site.example/installer", method: "GET", mode: "navigate" },
    respondWith: promise => { response = promise; },
  });
  const fallback = await response;
  assert.equal(fallback.status, 503);
  assert.equal(fallback.headers.get("Cache-Control"), "no-store");
  assert.match(await fallback.text(), /Connexion Internet nécessaire/);
});
