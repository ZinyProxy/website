/**
 * Deploy: build the static site and push it on `main`.
 *
 * cPanel Git™ Version Control only cloned/tracks `main`, so the built `dist/`
 * is committed to `main` alongside source. `.cpanel.yml` then copies
 * dist/. -> /home/eabuiltc/web.ziny.io/ on deploy.
 *
 * Usage: npm run deploy
 * Then in cPanel > Git Version Control > website > Pull or Deploy:
 *   "Update from Remote"  ->  "Deploy HEAD Commit".
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const gitOut = (...a) => execFileSync('git', a).toString().trim();
const gitIO = (...a) => execFileSync('git', a, { stdio: 'inherit' });

// 1. Fresh production build (call Astro's bin directly — cross-platform).
console.log('▶ Building…');
execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { stdio: 'inherit' });
if (!existsSync('dist')) throw new Error('dist/ missing after build');

// 2. Stage everything (dist/ is tracked now) and commit if anything changed.
gitIO('add', '-A');
const dirty = execFileSync('git', ['status', '--porcelain']).toString().trim();
if (!dirty) {
  console.log('• No changes since last deploy — nothing to push.');
  process.exit(0);
}

const stamp = new Date().toISOString();
gitIO('-c', 'user.email=cosmocheats7@gmail.com', '-c', 'user.name=Val',
  'commit', '-q', '-m', `Deploy build ${stamp}`);
gitIO('push', '-q', 'origin', 'main');

console.log(`\n✓ Pushed ${gitOut('rev-parse', '--short', 'HEAD')} to origin/main.`);
console.log('  Now in cPanel: Pull or Deploy → Update from Remote → Deploy HEAD Commit.');
