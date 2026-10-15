import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createCheckoutServer } from './server.mjs';

const { server, reports } = createCheckoutServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
try {
  const page = await browser.newPage();
  const beacon = page.waitForResponse(response => response.url().endsWith('/integrity-report') && response.status() === 204);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => typeof window.dayjs === 'function');
  assert.equal(await page.evaluate(() => window.tamperedExecuted), undefined);
  await beacon;
  assert(reports.some(report => report.url.endsWith('/dayjs-1.11.13.js')), 'tampered file sends failure beacon');
  console.log('Pinned CDN script executed; tampered copy blocked; failure beacon received');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
