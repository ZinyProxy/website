/**
 * Deploy (Pattern A): build locally, then publish the static `dist/` to the
 * orphan `deploy` branch. cPanel Git™ Version Control pulls `deploy` and
 * `.cpanel.yml` copies the files to /home/eabuiltc/web.ziny.io/.
 *
 * Usage: npm run deploy
 * After it pushes, in cPanel > Git Version Control:
 *   "Update from Remote"  ->  "Deploy HEAD Commit".
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, readdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const WT = '.deploy-tmp';
const git = (...args) => execFileSync('git', args, { stdio: 'pipe' }).toString().trim();
const gitIO = (...args) => execFileSync('git', args, { stdio: 'inherit' });
// 1. Fresh production build (call Astro's bin directly — cross-platform,
//    avoids the Windows npm.cmd spawn EINVAL).
console.log('▶ Building…');
execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { stdio: 'inherit' });
if (!existsSync('dist')) throw new Error('dist/ missing after build');

// 2. Clean any stale worktree.
if (existsSync(WT)) {
  try { gitIO('worktree', 'remove', '--force', WT); } catch { rmSync(WT, { recursive: true, force: true }); }
}

// 3. Attach a worktree on `deploy` (orphan on first run).
git('fetch', 'origin', '--quiet');
const hasRemote = (() => { try { git('rev-parse', '--verify', 'origin/deploy'); return true; } catch { return false; } })();
const hasLocal = (() => { try { git('rev-parse', '--verify', 'refs/heads/deploy'); return true; } catch { return false; } })();

if (hasRemote || hasLocal) {
  gitIO('worktree', 'add', WT, hasRemote ? 'origin/deploy' : 'deploy');
  if (hasRemote) execFileSync('git', ['-C', WT, 'checkout', '-B', 'deploy', 'origin/deploy'], { stdio: 'inherit' });
} else {
  gitIO('worktree', 'add', '--orphan', '-b', 'deploy', WT);
}

// 4. Replace worktree contents with the fresh build + .cpanel.yml.
for (const entry of readdirSync(WT)) {
  if (entry === '.git') continue;
  rmSync(join(WT, entry), { recursive: true, force: true });
}
mkdirSync(join(WT, 'dist'), { recursive: true });
cpSync('dist', join(WT, 'dist'), { recursive: true });
cpSync('.cpanel.yml', join(WT, '.cpanel.yml'));

// 5. Commit & push (no-op safely if nothing changed).
execFileSync('git', ['-C', WT, 'add', '-A'], { stdio: 'inherit' });
const dirty = execFileSync('git', ['-C', WT, 'status', '--porcelain']).toString().trim();
if (dirty) {
  const stamp = new Date().toISOString();
  execFileSync('git', ['-C', WT, '-c', 'user.email=cosmocheats7@gmail.com', '-c', 'user.name=Val',
    'commit', '-q', '-m', `Deploy build ${stamp}`], { stdio: 'inherit' });
  execFileSync('git', ['-C', WT, 'push', '-u', 'origin', 'deploy'], { stdio: 'inherit' });
  console.log('\n✓ Pushed to origin/deploy. Now in cPanel: Update from Remote → Deploy HEAD Commit.');
} else {
  console.log('\n• No changes since last deploy — nothing to push.');
}

// 6. Detach worktree.
gitIO('worktree', 'remove', '--force', WT);
