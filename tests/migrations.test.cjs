const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { commandsFor, validateDatabaseUrl, migrationEnv } = require("../scripts/prisma.cjs");

const root = path.resolve(__dirname, "..");
const migrations = ["001_initial_schema", "002_electronic_signing", "003_admin_dashboard"];

test("seul un build Vercel de production migre automatiquement", () => {
  for (const env of [{}, { NODE_ENV: "production" }, { VERCEL: "1", VERCEL_ENV: "preview" },
    { VERCEL: "1", VERCEL_ENV: "development" }, { VERCEL_ENV: "production" }]) {
    assert.deepEqual(commandsFor(["auto"], env, migrations), []);
  }
  assert.deepEqual(commandsFor(["auto"], { VERCEL: "1", VERCEL_ENV: "production" }, migrations),
    [["migrate", "deploy"]]);
});

test("les commandes manuelles fonctionnent hors Vercel", () => {
  for (const action of ["deploy", "status"]) {
    assert.deepEqual(commandsFor([action], {}, migrations), [["migrate", action]]);
  }
});

test("la reprise marque seulement le prefixe explicitement choisi", () => {
  for (let index = 0; index < migrations.length; index++) {
    assert.deepEqual(commandsFor(["baseline", migrations[index]], {}, migrations),
      migrations.slice(0, index + 1).map(name => ["migrate", "resolve", "--applied", name]));
  }
});

test("les commandes invalides sont refusees sans migration", () => {
  for (const args of [[], ["reset"], ["baseline"], ["baseline", "unknown"],
    ["deploy", "unexpected"], ["auto", "unexpected"], ["baseline", migrations[0], "unexpected"]]) {
    assert.throws(() => commandsFor(args, {}, migrations));
  }
});

test("la connexion est obligatoire et ne peut pas utiliser le pooler transactionnel", () => {
  for (const value of [undefined, "", "secret-invalide", "https://localhost/db",
    "postgresql://localhost", "postgresql://localhost:6543/postgres",
    "postgresql://localhost:5432/postgres?pgbouncer=true"]) {
    assert.throws(() => validateDatabaseUrl(value));
  }
  for (const value of ["postgres://localhost:5432/postgres",
    "postgresql://postgres:encoded%40password@localhost:5432/postgres?sslmode=require"]) {
    assert.doesNotThrow(() => validateDatabaseUrl(value));
  }
  assert.throws(() => validateDatabaseUrl("secret-invalide"), error => !error.message.includes("secret-invalide"));
});

test("les migrations importees preservent exactement le SQL historique dans une transaction", () => {
  for (const migration of migrations) {
    const original = fs.readFileSync(path.join(root, "supabase/migrations", `${migration}.sql`), "utf8").trim();
    const imported = fs.readFileSync(path.join(root, "prisma/migrations", migration, "migration.sql"), "utf8").trim();
    assert.equal(imported, `BEGIN;\n\n${original}\n\nCOMMIT;`);
  }
});

test("DIRECT_URL est prioritaire sans modifier les variables originales", () => {
  const env = {
    DIRECT_URL: "postgresql://localhost:5432/postgres",
    DATABASE_URL: "postgresql://localhost:6543/postgres?pgbouncer=true",
  };
  assert.equal(migrationEnv(env).DATABASE_URL, env.DIRECT_URL);
  assert.equal(env.DATABASE_URL, "postgresql://localhost:6543/postgres?pgbouncer=true");
  assert.equal(migrationEnv({ DATABASE_URL: env.DIRECT_URL }).DATABASE_URL, env.DIRECT_URL);
  assert.throws(() => migrationEnv({ DIRECT_URL: "invalid", DATABASE_URL: env.DIRECT_URL }));
});

test("Vercel passe par le hook npm et la commande Prisma", () => {
  const pkg = require("../package.json");
  assert.equal(require("../vercel.json").buildCommand, "npm run build");
  assert.equal(pkg.scripts.prebuild, "node scripts/prisma.cjs auto");
  assert.equal(pkg.scripts.build, "next build");
});

test("la configuration absente bloque le processus de production avant Prisma", () => {
  const result = spawnSync(process.execPath, ["scripts/prisma.cjs", "auto"], {
    cwd: root,
    env: { ...process.env, VERCEL: "1", VERCEL_ENV: "production", DATABASE_URL: "", DIRECT_URL: "" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL est obligatoire/);
});

test("un echec Prisma est propage au processus de build", () => {
  const result = spawnSync(process.execPath, ["scripts/prisma.cjs", "auto"], {
    cwd: root,
    env: { ...process.env, VERCEL: "1", VERCEL_ENV: "production",
      DIRECT_URL: "",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /P1001/);
});
