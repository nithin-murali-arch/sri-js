import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const server = createServer(async (request, response) => {
  const path = request.url === '/' ? 'index.html' : request.url.slice(1);
  if (!/^(index\.html|assets\/[\w.-]+\.js)$/.test(path)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html');
  response.end(await readFile(`dist/${path}`));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => document.body.dataset.integrity);
  assert.equal(await page.evaluate(() => document.body.dataset.integrity), 'sha384-replace-with-your-build-hash');
  console.log('Packed browser export set integrity in Chrome');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
