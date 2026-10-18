import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';

const directory = process.argv[2] ?? 'dist';
const failures = [];
let pages = 0;
for (const file of await readdir(directory, { recursive: true })) {
  if (!file.endsWith('.html')) continue;
  pages += 1;
  const path = join(directory, file);
  const $ = load(await readFile(path, 'utf8'));
  $('script[src]').each((_, script) => {
    if (!$(script).attr('integrity')?.trim()) failures.push(`${path}: ${$(script).attr('src')}`);
  });
}
if (!pages) failures.push(`${directory}: no HTML files found`);
if (failures.length) {
  console.error(`Missing integrity:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`SRI check passed for ${pages} HTML file(s)`);
}
