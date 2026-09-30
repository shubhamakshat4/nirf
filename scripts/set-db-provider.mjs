/* Align the Prisma datasource provider with DATABASE_URL.
 *
 * Prisma does not accept an env var for `provider`, so the line has to be
 * rewritten in the schema before `prisma generate`. This script does that from
 * the connection string, which is what makes swapping databases a
 * connection-string change and nothing else. The models, lib/db/*.ts and the
 * application code are identical across both providers.
 *
 *   node scripts/set-db-provider.mjs --auto    # from DATABASE_URL (used by npm run build)
 *   node scripts/set-db-provider.mjs postgresql
 *   node scripts/set-db-provider.mjs sqlite
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const VALID = ["sqlite", "postgresql"];
const arg = process.argv[2];
const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "prisma/schema.prisma");

/** Read DATABASE_URL from the environment, falling back to .env — Prisma's own
    lookup order. No dependency on dotenv. */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(root, ".env");
  if (!existsSync(envFile)) return "";
  const line = readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : "";
}

function providerFor(url) {
  if (/^postgres(ql)?:\/\//i.test(url)) return "postgresql";
  if (/^file:/i.test(url)) return "sqlite";
  return null;
}

let target;
if (arg === "--auto") {
  const url = databaseUrl();
  target = providerFor(url);
  if (!target) {
    // Nothing to go on: leave the schema as committed rather than guessing.
    console.log(`DATABASE_URL ${url ? `("${url.slice(0, 12)}…") is not recognised` : "is not set"} — leaving the provider unchanged.`);
    process.exit(0);
  }
} else if (VALID.includes(arg)) {
  target = arg;
} else {
  console.error(`Usage: node scripts/set-db-provider.mjs <--auto|${VALID.join("|")}>`);
  process.exit(1);
}

const src = readFileSync(file, "utf8");
// Only the datasource provider, never the generator's "prisma-client-js".
const re = /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([^"]+)(")/;
const match = src.match(re);
if (!match) {
  console.error("Could not find the datasource provider in prisma/schema.prisma");
  process.exit(1);
}

if (match[2] === target) {
  console.log(`Prisma provider is already "${target}".`);
  process.exit(0);
}

writeFileSync(file, src.replace(re, `$1${target}$3`));
console.log(`Prisma provider: ${match[2]} -> ${target}`);
