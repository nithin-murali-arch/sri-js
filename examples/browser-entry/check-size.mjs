import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const assets = await readdir('dist/assets');
const scripts = assets.filter(file => file.endsWith('.js'));
assert(scripts.length > 0, 'Vite emitted a JavaScript consumer');
const sizes = await Promise.all(scripts.map(async file => gzipSync(await readFile(`dist/assets/${file}`)).length));
const total = sizes.reduce((sum, size) => sum + size, 0);
assert(total < 2048, `Browser consumer is ${total} bytes gzipped, expected under 2048`);
console.log(`Browser consumer: ${total} bytes gzipped, below 2048`);
