import { createRequire } from 'node:module';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { generateSRI, updateHTML } = require('@nithin93/sri-js');
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const sri = await generateSRI({ algorithm: 'sha384', basePath: root }).generateForDirectory();
for (const path of await readdir(root, { recursive: true })) {
  if (!path.endsWith('.html')) continue;
  const file = join(root, path);
  const html = await readFile(file, 'utf8');
  await writeFile(file, updateHTML(html, sri));
}
console.log('Added SRI to generated HTML files:', Object.keys(sri).join(', '));
