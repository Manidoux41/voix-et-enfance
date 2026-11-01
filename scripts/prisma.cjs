const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { loadEnvConfig } = require("@next/env");

const root = path.resolve(__dirname, "..");

function commandsFor(args, env, migrations) {
  const [action, target, ...extra] = args;
  if (action === "auto" && !target && !extra.length) {
    if (env.VERCEL !== "1" || env.VERCEL_ENV !== "production") return [];
    return [["migrate", "deploy"]];
  }
  if (["deploy", "status"].includes(action) && !target && !extra.length) {
    return [["migrate", action]];
  }
  if (action === "baseline" && target && !extra.length) {
    const index = migrations.indexOf(target);
    if (index === -1) throw new Error(`Migration inconnue : ${target}`);
    return migrations.slice(0, index + 1).map(name => ["migrate", "resolve", "--applied", name]);
  }
  throw new Error("Usage : prisma.cjs auto|deploy|status|baseline <derniere_migration_deja_appliquee>");
}

function validateDatabaseUrl(value) {
  if (!value) throw new Error("DATABASE_URL est obligatoire pour les migrations Prisma.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL doit etre une URL PostgreSQL valide.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new Error("DATABASE_URL doit etre une URL PostgreSQL avec un nom de base.");
  }
  if (url.port === "6543" || url.searchParams.get("pgbouncer") === "true") {
    throw new Error("Utiliser une connexion directe ou le pooler Supabase en mode session (port 5432), pas le mode transaction.");
  }
}

function migrationEnv(env) {
  const value = env.DIRECT_URL || env.DATABASE_URL;
  validateDatabaseUrl(value);
  return { ...env, DATABASE_URL: value };
}

function run() {
  const migrations = fs.readdirSync(path.join(root, "prisma/migrations"), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const commands = commandsFor(process.argv.slice(2), process.env, migrations);
  if (!commands.length) {
    console.log("Migrations automatiques ignorees hors build Vercel de production.");
    return;
  }
  loadEnvConfig(root, process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1");
  const env = migrationEnv(process.env);
  for (const args of commands) {
    const result = spawnSync(process.execPath, [
      require.resolve("prisma/build/index.js"), ...args,
      "--schema", path.join(root, "prisma/schema.prisma"),
    ], { cwd: root, env, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      process.exitCode = result.status || 1;
      return;
    }
  }
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { commandsFor, validateDatabaseUrl, migrationEnv };
