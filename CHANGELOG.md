# Changelog

All notable changes to `@nithin93/sri-js` are documented here.

## 1.2.5 — 2026-10-15

- Script URLs with a query string or hash now get integrity. `/static/app.js?v=2` matches the config key `app.js` in both `updateHTML` and the browser bundle. A key that includes the query string, such as `app.js?v=2`, still wins.
- `enforceScriptIntegrity` and the `SRIConfig` type are now exported from the package entry point.
- `updateHTML` and `updateHtmlScripts` type-check with two arguments. `prefix` is optional.
- `exports` now includes `./sri-js.js` (the browser bundle), `./package.json`, and a `types` condition.
- `engines.node` is now `>=20.18.1`, matching the cheerio 1.2 that a fresh install resolves.
- README: fixed the browser setup (`window.SRI` must be defined before the script tag), fixed the `updateHTML` output example, removed the "Zero Dependencies" claim, documented `generateSRI` and `SRIGenerator`, and added alternatives and FAQ sections.
- Package description and keywords updated.
- Release workflow skips `npm publish` when the version is already on npm.
- Added tests for the browser bundle loaded in jsdom and for importing the package in Node without a `document`.

## 1.2.4 — 2026-10-02

- Test suite fixed and green 20/20 (jsdom env dep, cheerio CJS mapping, setup globals).
- Repository/bugs/homepage metadata added.
- CI uses npm ci on Node 22/24 with build step.
- ESLint 9 added.
- Audit fixes (11 to 1, esbuild moderate dev-only remains, breaking-only fix).
- repository.url uses the plain GitHub URL form (trusted publishing requires an exact match).
