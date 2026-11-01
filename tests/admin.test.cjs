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
    process: { env }, console: { error() {}, info() {} }, Request, Response, Buffer, URL, File, FormData,
  });
  return exports;
}
  function emailFixture(response, env = { MAILJET_API_KEY: "test-api-key", MAILJET_SECRET_KEY: "test-secret-key", EMAIL_FROM: "sender@example.invalid" }) {
    const exports = {};
    let calls = 0;
    const logs = [];
    const js = ts.transpileModule(fs.readFileSync(path.join(root, "src/lib/signing/email.ts"), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(js, {
      exports, require: name => name === "server-only" ? {} : require(name),
      process: { env }, console: { error: (...args) => logs.push(args), info: (...args) => logs.push(args) },
      Buffer,
      fetch: async (_url, options) => {
        calls++;
        assert.equal(_url, "https://api.mailjet.com/v3.1/send");
        assert.equal(options.headers.Authorization, `Basic ${Buffer.from(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`).toString("base64")}`);
        const body = JSON.parse(options.body);
        assert.equal(body.SandboxMode, undefined);
        assert.equal(body.Messages.length, 1);
        assert.equal(body.Messages[0].From.Email, env.EMAIL_FROM);
        assert.equal(body.Messages[0].To[0].Email, "recipient@example.invalid");
        assert.ok(body.Messages[0].TextPart.includes("123456"));
        return response;
      },
    });
    return { email: exports, calls: () => calls, logs };
  }
  function mailjetSuccess(overrides = {}) {
    return { Messages: [{ Status: "success", To: [{ Email: "recipient@example.invalid", MessageUUID: "test-message-id", MessageID: 456 }], ...overrides }] };
  }
  test("Mailjet doit confirmer le code par un identifiant de message sans journaliser de secrets", async () => {
    const fixture = emailFixture(Response.json(mailjetSuccess(), { status: 200 }));
    assert.equal(await fixture.email.sendOtpEmail("recipient@example.invalid", "123456", "Test"), "test-message-id");
    assert.equal(fixture.calls(), 1);
    const logs = JSON.stringify(fixture.logs);
    assert.ok(logs.includes("test-message-id"));
    for (const privateValue of ["123456", "test-api-key", "test-secret-key", "recipient@example.invalid"]) {
      assert.ok(!logs.includes(privateValue));
    }
  });
  test("Mailjet refuse explicitement les echecs HTTP et les succes sans confirmation", async () => {
    for (const response of [
      Response.json({ message: "private-provider-details" }, { status: 401 }),
      Response.json({}, { status: 201 }),
      Response.json(mailjetSuccess({ Status: "error", Errors: [{ ErrorMessage: "private-provider-details" }] }), { status: 200 }),
      Response.json(mailjetSuccess({ To: [] }), { status: 200 }),
      Response.json(mailjetSuccess({ To: [{ Email: "recipient@example.invalid", MessageUUID: " " }] }), { status: 200 }),
      Response.json(mailjetSuccess({ To: [{ Email: "other@example.invalid", MessageUUID: "test-message-id" }] }), { status: 200 }),
      Response.json({ Messages: [] }, { status: 200 }),
      new Response("invalid-json", { status: 200 }),
    ]) {
      const fixture = emailFixture(response);
      await assert.rejects(fixture.email.sendOtpEmail("recipient@example.invalid", "123456", "Test"));
      assert.ok(!JSON.stringify(fixture.logs).includes("private-provider-details"));
    }
    for (const env of [{}, { MAILJET_API_KEY: "key", EMAIL_FROM: "sender@example.invalid" },
      { MAILJET_SECRET_KEY: "secret", EMAIL_FROM: "sender@example.invalid" },
      { MAILJET_API_KEY: "key", MAILJET_SECRET_KEY: "secret" }]) {
      const fixture = emailFixture(null, env);
      await assert.rejects(fixture.email.sendOtpEmail("recipient@example.invalid", "123456", "Test"));
      assert.equal(fixture.calls(), 0);
    }
  });
  test("la demande enregistre la reference Mailjet et ne confirme pas un envoi refuse", async () => {
    for (const rejected of [false, true]) {
      let audit;
      const route = load("src/app/api/signatories/route.ts", {
        "@/lib/validators/signatory": load("src/lib/validators/signatory.ts"),
        "@/lib/signing/security": { createOtp: () => "123456", hashOtp: () => "hashed-otp" },
        "@/lib/signing/email": { sendOtpEmail: async () => {
          if (rejected) throw new Error("Envoi refusé");
          return "test-message-id";
        } },
        "@/lib/supabase/server": { createSupabaseAdmin: () => ({
          from: table => {
            if (table === "documents") return { select: () => ({ eq: () => ({ eq: () => ({
              single: async () => ({ data: { id: "doc-id", sha256_hash: "doc-hash" }, error: null }),
            }) }) }) };
            if (table === "signatories") return { insert: () => ({ select: () => ({
              single: async () => ({ data: { id: "request-id" }, error: null }),
            }) }) };
            if (table === "signatures") return { insert: async () => ({ error: null }) };
            assert.equal(table, "audit_logs");
            return { insert: async entry => { audit = entry; return { error: null }; } };
          },
        }) },
      });
      const response = await route.POST(new Request("https://site.example/api/signatories", {
        method: "POST", body: JSON.stringify({
          documentId: "10000000-0000-4000-8000-000000000001",
          organizationName: "Test", organizationType: "Association",
          representativeName: "Test", representativeRole: "Test",
          email: "recipient@example.invalid", hasReadDocument: true, confirmsAuthority: true, confirmsSupport: true,
        }),
      }));
      assert.equal(response.status, rejected ? 503 : 201);
      const body = await response.json();
      if (rejected) {
        assert.equal(audit, undefined);
        assert.equal(body.status, undefined);
      } else {
        assert.equal(body.status, "otp_sent");
        assert.equal(audit.metadata.email_message_id, "test-message-id");
        assert.ok(!JSON.stringify(audit).includes("123456"));
      }
    }
  });
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
    "@/lib/admin/password": load("src/lib/admin/password.ts"),
    "@/lib/admin/registry-pdf": load("src/lib/admin/registry-pdf.ts"),
    "@/lib/signing/email": { sendTransactionalEmail() { throw new Error("unexpected email"); } },
    "next/server": { NextResponse },
  };
  for (const file of ["signatories", "signatures/download", "documents", "users", "content", "export", "export/pdf", "audit", "invitations", "password"]) {
    const route = load(`src/app/api/admin/${file}/route.ts`, mocks);
    for (const method of ["GET","POST","PUT","PATCH","DELETE"]) {
      if (typeof route[method] !== "function") continue;
      const result = await route[method](new Request(`https://site.example/api/admin/${file}`, { method, headers: { Origin: "https://site.example" } }));
      assert.equal(result.status, 401, `${file} ${method}`);
    }
  }
  assert.equal(fixture.checks(), 0);
});
test("l’origine Vercel est utilisee seulement depuis les variables de confiance", () => {
  const { auth } = authFixture({ env: {
    NEXT_PUBLIC_APP_URL: "", VERCEL: "1", VERCEL_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "site.example", VERCEL_URL: "preview.example",
  } });
  assert.equal(auth.adminOrigin(), "https://site.example");
  assert.throws(() => auth.requireSameOrigin(new Request("https://attacker.example", {
    method: "POST", headers: { Origin: "https://attacker.example" },
  })), error => error.status === 403);
  assert.equal(authFixture({ env: {
    NEXT_PUBLIC_APP_URL: "", VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "preview.example",
  } }).auth.adminOrigin(), "https://preview.example");
  for (const env of [{ NEXT_PUBLIC_APP_URL: "" }, { NEXT_PUBLIC_APP_URL: "invalid" },
    { NEXT_PUBLIC_APP_URL: "http://site.example", NODE_ENV: "production" }]) {
    assert.throws(() => authFixture({ env }).auth.adminOrigin(), error => error.status === 503);
  }
});

test("les nouveaux mots de passe sont robustes et confirmes", () => {
  const { passwordFields } = load("src/lib/admin/password.ts");
  const password = "Example-Password123!";
  assert.equal(passwordFields.safeParse({ password, confirmation: password }).success, true);
  for (const value of ["short", "onlylowercasepassword", "ALLUPPERCASE123!", "WithoutDigits!", "NoSymbols123456"]) {
    assert.equal(passwordFields.safeParse({ password: value, confirmation: value }).success, false);
  }
  assert.equal(passwordFields.safeParse({ password, confirmation: "different" }).success, false);
});

function accountRoute(file, { db, client, user = { id: "admin-id", email: "admin@example.invalid" } }) {
  const auth = authFixture().auth;
  return load(`src/app/api/admin/${file}/route.ts`, {
    "@/lib/admin/auth": { ...auth, createSessionClient: async () => client },
    "@/lib/admin/password": load("src/lib/admin/password.ts"),
    "@/lib/admin/http": httpFixture({ ...auth, requireAdmin: async () => ({ db, user }) }),
  });
}
const accountRequest = (path, body) => new Request(`https://site.example/api/admin/${path}`, {
  method: "PUT", headers: { Origin: "https://site.example", "Content-Type": "application/json" }, body: JSON.stringify(body),
});
test("le changement de mot de passe reauthentifie le compte et ne journalise aucun secret", async () => {
  let updated = false;
  let audit;
  const fields = { currentPassword: "Old-password123!", password: "New-password123!", confirmation: "New-password123!" };
  const route = accountRoute("password", {
    client: { auth: {
      signInWithPassword: async credentials => { assert.equal(credentials.email, "admin@example.invalid"); assert.equal(credentials.password, fields.currentPassword); return { error: null }; },
      updateUser: async credentials => { updated = true; assert.equal(credentials.password, fields.password); return { error: null }; },
    } },
    db: { from: table => { assert.equal(table, "audit_logs"); return { insert: async entry => { audit = entry; return { error: null }; } }; } },
  });
  assert.equal((await route.PUT(accountRequest("password", fields))).status, 200);
  assert.equal(updated, true);
  assert.equal(audit.action, "admin.password_changed");
  assert.ok(!JSON.stringify(audit).includes("password123"));
});
test("un ancien mot de passe incorrect ou une confirmation invalide ne modifie rien", async () => {
  let updates = 0;
  const route = accountRoute("password", {
    db: {},
    client: { auth: {
      signInWithPassword: async () => ({ error: new Error("invalid credentials") }),
      updateUser: async () => { updates++; return { error: null }; },
    } },
  });
  const fields = { currentPassword: "wrong", password: "New-password123!", confirmation: "New-password123!" };
  assert.equal((await route.PUT(accountRequest("password", fields))).status, 401);
  assert.equal((await route.PUT(accountRequest("password", { ...fields, confirmation: "different" }))).status, 400);
  assert.equal(updates, 0);
});

function activationRoute({ otpError = null, roleError = null } = {}) {
  let updates = 0;
  let signouts = 0;
  const auth = authFixture().auth;
  const client = { auth: {
    verifyOtp: async input => { assert.equal(input.type, "invite"); return { error: otpError }; },
    updateUser: async () => { updates++; return { error: null }; },
    signOut: async () => { signouts++; return { error: null }; },
  } };
  const route = load("src/app/api/admin/activate/route.ts", {
    "@/lib/admin/password": load("src/lib/admin/password.ts"),
    "@/lib/admin/auth": {
      ...auth, createSessionClient: async () => client,
      requireAdmin: async () => {
        if (roleError) throw new auth.AdminError("Accès refusé.", 403);
        return { user: { id: "admin-id" }, db: { from: () => ({ insert: async () => ({ error: null }) }) } };
      },
    },
  });
  return { route, updates: () => updates, signouts: () => signouts };
}
function activationRequest() {
  return new Request("https://site.example/api/admin/activate", {
    method: "POST", headers: { Origin: "https://site.example" },
    body: JSON.stringify({ tokenHash: "test-token", password: "New-password123!", confirmation: "New-password123!" }),
  });
}
test("un lien valide active uniquement un compte encore autorise", async () => {
  const fixture = activationRoute();
  assert.equal((await fixture.route.POST(activationRequest())).status, 200);
  assert.equal(fixture.updates(), 1);
});
test("une invitation expiree ou revoquee ne permet pas de changer le mot de passe", async () => {
  for (const options of [{ otpError: new Error("expired") }, { roleError: true }]) {
    const fixture = activationRoute(options);
    const response = await fixture.route.POST(activationRequest());
    assert.equal(response.status, options.roleError ? 403 : 400);
    assert.equal(fixture.updates(), 0);
    if (options.roleError) assert.equal(fixture.signouts(), 1);
  }
});
test("une invitation est autorisee avant son envoi et ne divulgue pas son lien dans la reponse", async () => {
  const events = [];
  const auth = authFixture().auth;
  const db = {
    from: table => {
      assert.equal(table, "audit_logs");
      return { insert: async entry => {
        assert.equal(entry.action, "admin.invitation_sent");
        assert.equal(entry.metadata.email_message_id, "mailjet-message");
        events.push("audit");
        return { error: null };
      } };
    },
    auth: { admin: { generateLink: async input => {
      assert.equal(input.type, "invite");
      return { data: { user: { id: "invited-id" }, properties: { hashed_token: "private-token" } }, error: null };
    } } },
    rpc: async (name, input) => {
      assert.equal(name, "set_site_admin"); assert.equal(input.target, "invited-id"); assert.equal(input.actor, "admin-id");
      events.push("role"); return { error: null };
    },
  };
  const route = load("src/app/api/admin/invitations/route.ts", {
    "@/lib/admin/auth": auth,
    "@/lib/admin/http": httpFixture({ ...auth, requireAdmin: async () => ({ user: { id: "admin-id" }, db }) }),
    "@/lib/signing/email": { sendTransactionalEmail: async (_email, _subject, text) => {
      events.push("email"); assert.ok(text.includes("https://site.example/admin/activate#token_hash=private-token"));
      return "mailjet-message";
    } },
  });
  const response = await route.POST(new Request("https://site.example/api/admin/invitations", {
    method: "POST", headers: { Origin: "https://site.example" }, body: JSON.stringify({ email: "new@example.invalid" }),
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(events, ["role", "email", "audit"]);
  assert.ok(!(await response.text()).includes("private-token"));
});
test("le registre PDF pagine les signatures sans modifier les pages sources", async () => {
  const { PDFDocument } = require("pdf-lib");
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(root, "src/lib/admin/registry-pdf.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  // pdf-lib validates objects with instanceof; keep its inputs in the same VM realm.
  new Function("exports", "require", js)(exports, require);
  const { buildRegistryPdf } = exports;
  const original = await PDFDocument.create();
  original.addPage([300, 400]);
  const source = await original.save();
  const snapshot = Buffer.from(source);
  const row = {
    structure: "Association de protection de l’enfance", type: "Association",
    representative: "Émilie Dupont", role: "Présidente", signedAt: "2026-11-01T12:00:00Z", version: "Proposition - v1",
  };
  const rows = Array.from({ length: 101 }, (_, index) => ({ ...row, structure: `${index + 1} ${row.structure}` }));
  const standalone = await buildRegistryPdf(rows);
  const combined = await buildRegistryPdf(rows, source);
  const registry = await PDFDocument.load(standalone.bytes);
  const appendix = await PDFDocument.load(combined.bytes);
  assert.ok(registry.getPageCount() > 1);
  assert.equal(appendix.getPageCount(), registry.getPageCount() + 1);
  assert.equal(appendix.getPage(0).getWidth(), 300);
  assert.equal(appendix.getPage(0).getHeight(), 400);
  assert.deepEqual(Buffer.from(source), snapshot);
  const long = await buildRegistryPdf([{ ...row, structure: "A".repeat(12000) }]);
  assert.ok(long.registryPages > 1);
  const empty = await buildRegistryPdf([]);
  assert.equal(empty.registryPages, 1);
  await assert.rejects(buildRegistryPdf([{ ...row, signedAt: "invalid" }]));
});
test("l’export PDF lit toutes les pages et filtre les preuves finalisees par version", async () => {
  const auth = authFixture().auth;
  const calls = [];
  let exportedRows;
  let audit;
  const db = {
    from: table => {
      if (table === "audit_logs") return { insert: async entry => { audit = entry; return { error: null }; } };
      assert.equal(table, "signatures");
      const query = {
        select: () => query,
        eq: (key, value) => { calls.push(["eq", key, value]); return query; },
        not: (key, operator, value) => { calls.push(["not", key, operator, value]); return query; },
        order: key => { calls.push(["order", key]); return query; },
        range: (start, end) => { calls.push(["range", start, end]); return query; },
        then: resolve => resolve({ data: calls.filter(call => call[0] === "range").length === 1
          ? Array.from({ length: 500 }, () => ({
            signed_at: "2026-11-01T12:00:00Z",
            signatory: { organization_name: "Test", organization_type: "Association", representative_name: "Test", representative_role: "Test" },
            document: { title: "Proposition", version: "v1" },
          })) : [], error: null }),
      };
      return query;
    },
  };
  const route = load("src/app/api/admin/export/pdf/route.ts", {
    "@/lib/admin/http": httpFixture({ ...auth, requireAdmin: async () => ({ user: { id: "admin-id" }, db }) }),
    "@/lib/admin/auth": auth,
    "@/lib/admin/registry-pdf": { buildRegistryPdf: async rows => {
      exportedRows = rows; return { bytes: Buffer.from("%PDF-test"), registryPages: 10 };
    } },
    "@/lib/signing/security": {},
  });
  const id = "10000000-0000-4000-8000-000000000001";
  const response = await route.GET(new Request(`https://site.example/api/admin/export/pdf?documentId=${id}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(exportedRows.length, 500);
  assert.deepEqual(calls.filter(call => call[0] === "range"), [["range", 0, 499], ["range", 500, 999]]);
  for (const key of ["email_verified_at", "signed_at", "signed_pdf_path", "signed_pdf_hash"]) {
    assert.ok(calls.some(call => call[0] === "not" && call[1] === key));
  }
  assert.ok(calls.some(call => call[0] === "eq" && call[1] === "document_id" && call[2] === id));
  assert.ok(calls.some(call => call[0] === "eq" && call[1] === "status" && call[2] === "signed"));
  assert.equal(audit.metadata.count, 500);
  assert.equal(audit.action, "signatures.pdf_exported");
  assert.equal((await route.GET(new Request("https://site.example/api/admin/export/pdf?format=appendix"))).status, 400);
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
