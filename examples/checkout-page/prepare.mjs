import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const { updateHTML } = createRequire(import.meta.url)('@nithin93/sri-js');

const url = 'https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.13/dayjs.min.js';
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const library = await response.text();
const integrity = `sha384-${createHash('sha384').update(library).digest('base64')}`;
await mkdir('public', { recursive: true });
await writeFile('public/dayjs-1.11.13.js', `${library}\nwindow.tamperedExecuted = true;`);
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pinned checkout scripts</title>
<script>
window.onSriFail = function(event) {
  navigator.sendBeacon('/integrity-report', JSON.stringify({ url: event.target.src }));
};
</script></head><body><h1>Checkout script integrity demonstration</h1>
<p>This page demonstrates pinned script integrity. It does not process payments.</p>
<script src="${url}"></script>
<script src="/dayjs-1.11.13.js"></script>
</body></html>`;
await writeFile('public/index.html', updateHTML(page, {
  'dayjs.min.js': integrity,
  'dayjs-1.11.13.js': integrity,
}, undefined, 'onSriFail'));
await writeFile('public/pinned.json', JSON.stringify({ url, integrity }, null, 2));
console.log(`Pinned ${url} at ${integrity}`);
