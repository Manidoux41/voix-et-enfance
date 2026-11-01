const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");

function pageFixture(total, error = null) {
  const exports = {};
  const query = {
    select: (_columns, options) => { assert.equal(options.count, "exact"); return query; },
    order: () => query,
    range: (start, end) => {
      assert.equal(start, 50);
      assert.equal(end, 99);
      return { data: [], count: total, error };
    },
  };
  const mocks = {
    "@/lib/site-content": { getSiteContent: async () => ({ title: "Signataires", introduction: "Registre", registerTitle: "Structures" }) },
    "@/lib/supabase/server": { createSupabaseAdmin: () => ({
      from: table => { assert.equal(table, "published_structures"); return query; },
    }) },
  };
  const js = ts.transpileModule(fs.readFileSync("src/app/signataires/page.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("exports", "require", "process", js)(
    exports, name => name in mocks ? mocks[name] : require(name),
    { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: "test" } },
  );
  return () => exports.default({ searchParams: Promise.resolve({ page: "2" }) });
}

test("le compteur public utilise le total du registre, pas les resultats de la page", async () => {
  for (const count of [0, 1, 125]) {
    const html = renderToStaticMarkup(await pageFixture(count)());
    assert.ok(html.includes(`<strong>${count}</strong>`));
    assert.ok(html.includes(count === 1 ? "Signature finalisée publiée" : "Signatures finalisées publiées"));
    assert.ok(html.includes("Les demandes en attente et les signatures non publiées"));
  }
});

test("une erreur ou un total absent ne produit pas un compteur zero trompeur", async () => {
  await assert.rejects(pageFixture(null)(), /comptabiliser/);
  await assert.rejects(pageFixture(null, new Error("offline"))(), /registre public/);
});
