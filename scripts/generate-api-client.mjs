// Contract sync: pulls the frozen OpenAPI contract into the frontend snapshot and
// generates the typed client. Two sources (dev):
//   1. --url <backend-openapi-url>  (live backend, OPENAPI_SOURCE_URL)
//   2. backend/contracts/openapi.json when running inside this workspace (fallback)
// In CI the repository snapshot at src/api/schema/openapi.json is authoritative.
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const urlFlagIdx = args.indexOf("--url");
const sourceUrl =
  (urlFlagIdx >= 0 ? args[urlFlagIdx + 1] : undefined) ?? process.env.OPENAPI_SOURCE_URL;

const root = resolve(process.cwd());
const snapshotDir = resolve(root, "src/api/schema");
const snapshot = resolve(snapshotDir, "openapi.json");
const generatedDir = resolve(root, "src/api/generated");

mkdirSync(snapshotDir, { recursive: true });
mkdirSync(generatedDir, { recursive: true });

if (sourceUrl) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`failed to fetch ${sourceUrl}: ${res.status}`);
  writeFileSync(snapshot, JSON.stringify(await res.json(), null, 2));
  console.log(`[api] fetched contract from ${sourceUrl}`);
} else {
  // workspace fallback: backend contract sits next to the frontend project
  const backendContract = resolve(root, "..", "backend", "contracts", "openapi.json");
  if (existsSync(backendContract)) {
    writeFileSync(snapshot, readFileSync(backendContract));
    console.log("[api] copied contract from ../backend/contracts/openapi.json");
  } else if (!existsSync(snapshot)) {
    throw new Error("no contract source available (set OPENAPI_SOURCE_URL or run a backend)");
  } else {
    console.log("[api] using existing snapshot");
  }
}

// openapi-typescript (redocly) URL-decodes file paths — non-ASCII workspace paths
// break it. Stage the contract + output through an ASCII-safe temp directory.
const os = await import("node:os");
const tmpStage = resolve(os.tmpdir(), "shijie-api-gen");
mkdirSync(tmpStage, { recursive: true });

// The backend contract uses /api/v1-prefixed paths; the frontend client's baseUrl
// already includes /api/v1, so strip the prefix in the snapshot used for typing.
const raw = JSON.parse(readFileSync(snapshot, "utf-8"));
const stripped = { ...raw, paths: {} };
for (const [p, def] of Object.entries(raw.paths ?? {})) {
  stripped.paths[p.replace(/^\/api\/v1/, "") || p] = def;
}
const tmpSnapshot = resolve(tmpStage, "openapi.json");
writeFileSync(snapshot, JSON.stringify(stripped, null, 2)); // snapshot keeps stripped form
writeFileSync(tmpSnapshot, JSON.stringify(stripped));
const tmpOut = resolve(tmpStage, "schema.d.ts");
copyFileSync(tmpSnapshot, tmpSnapshot); // noop guard

execSync(`npx openapi-typescript "${tmpSnapshot}" -o "${tmpOut}"`, { stdio: "inherit" });
copyFileSync(tmpOut, resolve(generatedDir, "schema.d.ts"));
console.log("[api] generated client types at src/api/generated/schema.d.ts");