/**
 * Env-loading bootstrap for a compiled service. Compiled `node dist/main.js` does NOT auto-load
 * .env.local (that is an Nx feature), so we replicate it: load the root .env.local (DB urls, service
 * host:ports, JWT paths, redis) then the app's .env.local (SERVICE_NAME / TCP_PORT / HTTP_PORT),
 * chdir into the app dir (so ../../secrets + prisma resolve), then require dist/main.js.
 * Usage: node scripts/run-svc.cjs apps/<service>
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const appRel = process.argv[2];
if (!appRel) {
  console.error('usage: node scripts/run-svc.cjs apps/<service>');
  process.exit(2);
}
const appDir = path.resolve(ROOT, appRel);

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (let line of fs.readFileSync(file, 'utf8').split('\n')) {
    line = line.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv(path.join(ROOT, '.env.local'));
loadEnv(path.join(appDir, '.env.local'));
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

process.chdir(appDir);
require(path.join(appDir, 'dist', 'main.js'));
