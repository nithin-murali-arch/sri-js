import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'sri-ci-'));
try {
  await mkdir(join(directory, 'nested'));
  await writeFile(join(directory, 'nested/index.html'), '<script src="/app.js" integrity="sha384-test"></script>');
  const run = () => spawnSync(process.execPath, [new URL('./check-sri.mjs', import.meta.url).pathname, directory], { encoding: 'utf8' });
  const passing = run();
  assert.equal(passing.status, 0, passing.stderr);
  console.log(passing.stdout.trim());
  await writeFile(join(directory, 'broken.html'), '<script src="/missing.js"></script>');
  const failing = run();
  assert.equal(failing.status, 1, failing.stdout);
  assert.match(failing.stderr, /broken\.html: \/missing\.js/);
  console.log('Missing integrity fixture exited 1');
  await writeFile(join(directory, 'broken.html'), '<script src="/missing.js" integrity="  "></script>');
  assert.equal(run().status, 1);
  console.log('Whitespace integrity fixture exited 1');
} finally {
  await rm(directory, { recursive: true, force: true });
}
