Run `npm install /absolute/path/to/nithin93-sri-js-1.2.6.tgz`, `npx playwright install chromium`, `npm run prepare-page`, then `npm test` or `npm start`.

The generator pins dayjs 1.11.13 from cdnjs, then appends code to a local copy after hashing. Chromium must execute the CDN original, block the tampered local copy, and deliver its URL to the local beacon receiver. The network must allow cdnjs during preparation and verification. Generated files stay local.

Set `PLAYWRIGHT_EXECUTABLE_PATH` to an installed Chrome executable to reuse Chrome instead of Playwright's downloaded Chromium.
