const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { NextResponse } = require("next/server");

const root = path.resolve(__dirname, "..");
function load(file, mocks = {}, env = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, {
    exports, require: name => name === "server-only" ? {} : name in mocks ? mocks[name] : require(name),
    process: { env }, console: { error() {} }, Request, Response, Buffer, URL, File, FormData,
  });
  return exports;
}
function authFixture({ user = { id: "admin-id", email_confirmed_at: "2026-01-01" }, role = "admin", roleError = null, authError = null, env = {} } = {}) {
  let checks = 0;
  const auth = load("src/lib/admin/auth.ts", {
    "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
    "@supabase/ssr": { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
    "@/lib/supabase/server": { createSupabaseAdmin: () => ({
      from: table => {
        assert.equal(table, "admin_users");
        checks++;
        return { select: () => ({ eq: (_key, id) => {
          assert.equal(id, user.id);
          return { maybeSingle: async () => ({ data: role ? { role } : null, error: roleError }) };
        } }) };
      },
    }) },
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key", NEXT_PUBLIC_APP_URL: "https://site.example", ...env });
  return { auth, checks: () => checks };
}
function httpFixture(auth) {
  return load("src/lib/admin/http.ts", { "./auth": auth, "next/server": { NextResponse } });
}
test("une session absente n'interroge aucune donnée administrative", async () => {
  const fixture = authFixture({ user: null });
  await assert.rejects(fixture.auth.requireAdmin(), error => error.status === 401);
  assert.equal(fixture.checks(), 0);
});
test("une session invalide est refusée", async () => {
  const { auth } = authFixture({ authError: new Error("invalid token") });
  await assert.rejects(auth.requireAdmin(), error => error.status === 401);
});
for (const role of [null, "reviewer"]) {
  test(`le rôle ${role} n'autorise pas l'administration`, async () => {
    await assert.rejects(authFixture({ role }).auth.requireAdmin(), error => error.status === 403);
  });
}
test("un e-mail non confirmé est refusé même avec le rôle admin", async () => {
  await assert.rejects(authFixture({ user: { id: "id", email_confirmed_at: null } }).auth.requireAdmin(), error => error.status === 403);
});
test("une panne du contrôle de rôle ne produit pas d'autorisation", async () => {
  await assert.rejects(authFixture({ roleError: new Error("database offline") }).auth.requireAdmin(), error => error.status === 503);
});
test("un administrateur confirmé est autorisé ; les droits sont revérifiés", async () => {
  const fixture = authFixture();
  assert.equal((await fixture.auth.requireAdmin()).user.id, "admin-id");
  await fixture.auth.requireAdmin();
  assert.equal(fixture.checks(), 2);
});
test("la configuration d'authentification absente bloque l'accès", async () => {
  await assert.rejects(authFixture({ env: { NEXT_PUBLIC_SUPABASE_ANON_KEY: "" } }).auth.requireAdmin(), error => error.status === 503);
});
test("le contrôle d'origine refuse CSRF et origine absente", () => {
  const { auth } = authFixture();
  for (const origin of [null, "https://attacker.example"]) {
    assert.throws(() => auth.requireSameOrigin(new Request("https://site.example/api/admin/content", { method: "PUT", headers: origin ? { Origin: origin } : {} })), error => error.status === 403);
  }
  auth.requireSameOrigin(new Request("https://site.example/api/admin/content", { method: "PUT", headers: { Origin: "https://site.example" } }));
});
test("le wrapper bloque les GET privés et les mutations avant le handler", async () => {
  let executions = 0;
  const http = httpFixture(authFixture({ user: null }).auth);
  const handler = http.adminRoute(async () => { executions++; return NextResponse.json({ secret: true }); });
  for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
    const response = await handler(new Request("https://site.example/api/admin/data", { method, headers: { Origin: "https://site.example" } }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.ok(!(await response.text()).includes("secret"));
  }
  assert.equal(executions, 0);
});
test("un handler autorisé est exécuté, ses erreurs restent explicites", async () => {
  const http = httpFixture(authFixture().auth);
  const request = new Request("https://site.example/api/admin/data");
  const ok = await http.adminRoute(async () => NextResponse.json({ ok: true }))(request);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("cache-control"), /private, no-store/);
  const failure = await http.adminRoute(async () => { throw new Error("private database details"); })(request);
  assert.equal(failure.status, 503);
  assert.ok(!(await failure.text()).includes("private database details"));
});
test("la pagination refuse les valeurs non déterministes ou invalides", () => {
  const http = httpFixture(authFixture().auth);
  for (const page of ["0", "-1", "NaN", "1.5", "1000000"]) assert.throws(() => http.pagination(new Request(`https://site.example/?page=${page}`)));
  assert.equal(http.pagination(new Request("https://site.example/?page=2")).start, 25);
});
test("toutes les routes métier refusent l'accès anonyme avant la base", async () => {
  const fixture = authFixture({ user: null });
  const http = httpFixture(fixture.auth);
  const mocks = {
    "@/lib/admin/http": http, "@/lib/admin/auth": fixture.auth,
    "@/lib/admin/csv": load("src/lib/admin/csv.ts"),
    "@/lib/signing/security": { sha256() { throw new Error("unexpected hash"); } },
    "@/lib/content-fields": load("src/lib/content-fields.ts"),
    "next/server": { NextResponse },
  };
  for (const file of ["signatories", "signatures/download", "documents", "users", "content", "export", "audit"]) {
    const route = load(`src/app/api/admin/${file}/route.ts`, mocks);
    for (const method of ["GET","POST","PUT","PATCH","DELETE"]) {
      if (typeof route[method] !== "function") continue;
      const result = await route[method](new Request(`https://site.example/api/admin/${file}`, { method, headers: { Origin: "https://site.example" } }));
      assert.equal(result.status, 401, `${file} ${method}`);
    }
  }
  assert.equal(fixture.checks(), 0);
});
test("seules les signatures complètes peuvent proposer la publication", () => {
  const { canPublish } = load("src/lib/admin/types.ts");
  const sig = { status: "signed", email_verified_at: "date", signed_at: "date", signed_pdf_path: "private.pdf", signed_pdf_hash: "hash" };
  assert.equal(canPublish({ status: "signed", signatures: [sig] }), true);
  assert.equal(canPublish({ status: "pending_signature", signatures: [sig] }), false);
  assert.equal(canPublish({ status: "signed", signatures: [] }), false);
  for (const field of ["email_verified_at","signed_at","signed_pdf_path","signed_pdf_hash"]) {
    assert.equal(canPublish({ status: "signed", signatures: [{ ...sig, [field]: null }] }), false);
  }
});
test("les CSV échappent les séparateurs, guillemets et formules Excel", () => {
  const { csvCell } = load("src/lib/admin/csv.ts");
  assert.equal(csvCell('Une "association"; test'), '"Une ""association""; test"');
  for (const value of ["=1+1", " +SUM(A1)", "-1+2", "@SUM(A1)", "\tcmd"]) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell(null), '""');
});
test("le contenu validé est sauvegardé par RPC avec acteur et révision", async () => {
  const fields = load("src/lib/content-fields.ts").contentDefaults.signataires;
  const auth = authFixture().auth;
  let call;
  const route = load("src/app/api/admin/content/route.ts", {
    "@/lib/admin/http": { adminRoute: handler => request => handler(request, { user: { id: "admin-id" }, db: { rpc: async (name, params) => { call = { name, params }; return { data: 2, error: null }; } } }) },
    "@/lib/admin/auth": auth, "@/lib/content-fields": load("src/lib/content-fields.ts"),
    "next/server": { NextResponse },
  });
  const response = await route.PUT(new Request("https://site.example", { method: "PUT", body: JSON.stringify({ page: "signataires", fields, revision: 1 }) }));
  assert.equal(response.status, 200);
  assert.equal(call.name, "save_site_content");
  assert.equal(call.params.actor, "admin-id");
  assert.equal(call.params.expected_revision, 1);
  await assert.rejects(route.PUT(new Request("https://site.example", { method: "PUT", body: JSON.stringify({ page: "signataires", fields: { ...fields, unsafeField: "<script>" }, revision: 1 }) })), error => error.status === 400);
});
