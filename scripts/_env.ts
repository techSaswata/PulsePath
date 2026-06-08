/**
 * Loads .env.local for tsx scripts (Next.js loads it automatically at runtime,
 * but standalone scripts need it explicitly). No dotenv dependency: tiny parser.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      // Strip an unquoted trailing inline comment (matches Next.js's env loader).
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// .env.local takes precedence over .env (loaded first; existing keys win).
loadFile(resolve(process.cwd(), ".env.local"));
loadFile(resolve(process.cwd(), ".env"));
