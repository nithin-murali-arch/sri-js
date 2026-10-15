# @nithin93/sri-js

[![CI](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml/badge.svg)](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@nithin93%2Fsri-js.svg)](https://www.npmjs.com/package/@nithin93/sri-js)

`@nithin93/sri-js` is a Subresource Integrity (SRI) library for Node.js build scripts and browsers that adds `integrity` attributes to `<script>` tags in HTML and to scripts your page creates at runtime with `document.createElement`. The browser bundle is 851 bytes minified and 501 bytes gzipped. The Node side also generates sha256, sha384 and sha512 hashes for files.

## Install

```bash
npm install @nithin93/sri-js
```

Add integrity to the script tags in an HTML string:

```js
const { updateHTML } = require('@nithin93/sri-js');

const html = '<script src="/static/app.js"></script>';
console.log(updateHTML(html, { 'app.js': 'sha384-abc123' }));
// <html><head><script src="/static/app.js" integrity="sha384-abc123" crossorigin="anonymous"></script></head><body></body></html>
```

`sha384-abc123` is a placeholder. The next sections show how to generate real hashes. `updateHTML` parses the input with cheerio and returns a full document, so a fragment comes back wrapped in `<html><head>`.

## Usage

### Add integrity to script tags in HTML

`updateHTML(html, config)` looks at every `<script src>` and takes the last path segment of the `src` as the key into `config`. `/static/app.js` looks up `app.js`. A `src` with a query string or hash, such as `/static/app.js?v=2`, first looks up the exact segment `app.js?v=2`, then `app.js`. A matching script gets `integrity` and `crossorigin="anonymous"`. A script that already has an `integrity` attribute is left alone.

Pass a `prefix` to touch only scripts whose `src` contains it. Pass an `errorHandler` to add `onerror="<errorHandler>(event)"` to each script that gets an integrity attribute. `errorHandler` is written into the attribute as given, so it must be a trusted function name and never user input.

```js
updateHTML(html, config, '/static/', 'onSriFail');
```

### Generate hashes at build time

This script hashes every `.js` file under `dist`, then writes the hashes into `dist/index.html`. It assumes `dist/index.html` references scripts such as `<script src="/app.js"></script>`.

```js
const { readFileSync, writeFileSync } = require('node:fs');
const { generateSRI, updateHTML } = require('@nithin93/sri-js');

async function main() {
  const sri = generateSRI({ algorithm: 'sha384', basePath: 'dist' });
  const hashes = await sri.generateForDirectory(['.js']);
  // { 'app.js': 'sha384-...' }

  const html = readFileSync('dist/index.html', 'utf8');
  writeFileSync('dist/index.html', updateHTML(html, hashes));
}

main();
```

Hashes are keyed by file name only. Two files with the same name in different directories, such as `a/index.js` and `b/index.js`, collide and only one hash is kept. Run this on freshly built HTML, because `updateHTML` does not replace an `integrity` attribute that is already there.

You can also hash a single file from the shell. The hash matches the one `generateForFile` returns.

```bash
echo "sha384-$(openssl dgst -sha384 -binary dist/app.js | openssl base64 -A)"
```

### Add integrity to scripts created at runtime

Load the browser bundle after you define `window.SRI`. The bundle reads `window.SRI` once when it runs, so a `window.SRI` assignment placed after the script tag does nothing.

```html
<script>
  window.SRI = {
    config: {
      'app.js': 'sha384-hash1',
      'chunk.js': 'sha384-hash2'
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@nithin93/sri-js@1/public/sri-js.js"></script>
<script>
  const script = document.createElement('script');
  script.src = '/static/app.js'; // gets integrity and crossorigin="anonymous"
  document.head.appendChild(script);
</script>
```

The bundle replaces `document.createElement`. For each script it creates, assigning `src` sets `integrity` and `crossorigin="anonymous"` when the file name is in `config`. `window.SRI.prefix` is optional and limits matching to URLs that contain it.

The bundle does not cover:

- scripts that are already in the HTML when the page loads (use `updateHTML` for those)
- scripts whose URL is set with `script.setAttribute('src', url)`, because only the `src` property is intercepted

You can also install the package and serve `node_modules/@nithin93/sri-js/public/sri-js.js` yourself. The path `@nithin93/sri-js/sri-js.js` resolves to the same file.

In a browser, load the bundle instead of importing the package. The package entry point imports `node:crypto` and `node:fs/promises`.

## API

### `updateHTML(html, config, prefix?, errorHandler?)`

```ts
function updateHTML(html: string, config: SRIConfig, prefix?: string, errorHandler?: string): string
```

Returns the HTML as a full document with integrity attributes added as described above.

### `updateHtmlScripts(html, config, prefix?, errorHandler?)`

Same signature and behavior as `updateHTML`.

### `generateSRI(options)`

```ts
function generateSRI(options: SRIOptions): SRIGenerator
```

Returns `new SRIGenerator(options)`.

### `SRIGenerator`

```ts
class SRIGenerator {
  constructor(options: SRIOptions)
  generateHash(content: Buffer): string
  generateForFile(filePath: string): Promise<{ integrity: string; path: string }>
  generateForFiles(filePaths: string[]): Promise<SRIConfig>
  generateForDirectory(extensions?: string[]): Promise<SRIConfig>
}
```

- `generateHash` returns `"<algorithm>-<base64 digest>"`.
- `generateForFile` reads `filePath` relative to `options.basePath`. It returns the hash and the file's base name as `path`.
- `generateForFiles` returns a map of base name to hash and rejects if any file cannot be read.
- `generateForDirectory` walks `basePath` recursively and hashes files whose extension is in `extensions` (default `['.js']`). Files with the same base name collide, as described above.

### `enforceScriptIntegrity(config, prefix?)`

```ts
function enforceScriptIntegrity(config: SRIConfig, prefix?: string): void
```

The function the browser bundle calls. It replaces `document.createElement` once per page, so a second call is ignored. Importing the package in Node is safe because the function touches `document` only when you call it.

### Types

```ts
type SRIConfig = { [filename: string]: string } // file name to "sha384-..." hash

interface SRIOptions {
  algorithm: 'sha256' | 'sha384' | 'sha512'
  basePath: string
  errorHandler?: string // not used by SRIGenerator
}
```

## When to use it

- You build static HTML and want integrity attributes written into script tags as a build step.
- Your page loads scripts with `document.createElement('script')` and you want them to carry `integrity` without changing that code.
- You want to generate hashes in Node.js with the same package that writes them into HTML.
- Do not use it for third-party scripts that change in place without notice. A changed file fails its hash and the browser blocks it.

## Alternatives

| | Hashes files | Writes `integrity` into HTML | Adds `integrity` to scripts created at runtime | Where it runs | TypeScript types |
|---|---|---|---|---|---|
| `@nithin93/sri-js` | Yes | Yes | Yes, when `src` is set as a property | Node.js, plus a browser bundle | Yes |
| [`ssri`](https://www.npmjs.com/package/ssri) | Yes, plus parse and verify | No | No | Node.js | Not bundled |
| [`webpack-subresource-integrity`](https://www.npmjs.com/package/webpack-subresource-integrity) | Yes, during a webpack build | Yes, through `html-webpack-plugin` | Webpack's own chunk loading only | webpack builds | Yes |
| `integrity` by hand with `openssl dgst -sha384 -binary file \| openssl base64 -A` | Yes | No, you paste it | No | Any shell | Not applicable |

- Use `ssri` when you need to parse, compare or verify integrity strings, or hash streams.
- Use `webpack-subresource-integrity` when webpack produces your bundles and HTML. It knows about your chunks, which this package does not.
- Use `openssl` for a handful of static files that rarely change.
- This package differs in the browser bundle, which adds integrity to scripts created at runtime outside any bundler.

## FAQ

### What is subresource integrity?

Subresource Integrity (SRI) is a browser feature that checks a fetched script or stylesheet against a hash you put in its `integrity` attribute. If the bytes differ, the browser does not run the file. See the [MDN page on SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity).

### How do I generate an SRI hash for a file in Node.js?

Call `generateForFile` on an `SRIGenerator`. It returns the hash in the `sha384-...` form the `integrity` attribute expects.

```js
const { generateSRI } = require('@nithin93/sri-js');

generateSRI({ algorithm: 'sha384', basePath: 'dist' })
  .generateForFile('app.js')
  .then(({ integrity }) => console.log(integrity));
```

Without this package, use `crypto.createHash('sha384').update(fileBytes).digest('base64')` and prefix the result with `sha384-`.

### How do I add integrity attributes to dynamically loaded scripts?

Define `window.SRI.config`, then load `public/sri-js.js`. The bundle sets `integrity` and `crossorigin="anonymous"` on every script that you create with `document.createElement('script')` and give a `src` that matches a key in the config. The setup order and limits are in [Add integrity to scripts created at runtime](#add-integrity-to-scripts-created-at-runtime).

### How do I add SRI to script tags in an HTML file at build time?

Hash your built files with `generateForDirectory`, then pass the HTML and the hashes to `updateHTML`. A full script that does both is in [Generate hashes at build time](#generate-hashes-at-build-time).

### Does SRI work for scripts from a CDN?

Yes, if the script tag has a `crossorigin` attribute and the CDN responds with CORS headers. This package sets `crossorigin="anonymous"` for you. The CDN must also send an `Access-Control-Allow-Origin` header that allows your page. jsDelivr sends `Access-Control-Allow-Origin: *`.

### What happens when the hash does not match?

The browser refuses to run the script and fires an `error` event on the element. An `onerror` handler runs, and `updateHTML(html, config, prefix, 'myHandler')` adds `onerror="myHandler(event)"` for you. The browser also logs a console error.

### Does SRI help with PCI DSS 4.0 requirement 6.4.3?

SRI is one control for the script integrity part of that requirement. It does not make a page compliant. The requirement also asks you to confirm that each script is authorized and to keep an inventory with a justification for each script, and this package does neither.

### What is the difference between SRI and Content Security Policy?

CSP limits where a page may load scripts from, and SRI checks the content of a specific file. A script from an allowed origin still fails an SRI check if its bytes change, and a script with a valid hash still needs a CSP that allows its origin. The two work together.

## Support

- Node.js: `engines` requires `>=20.18.1`, the minimum for cheerio 1.2. CI runs the tests on Node 22 and 24.
- Browser: modern browsers that support the `integrity` attribute on script elements. The bundle targets ES2015 and is tested in jsdom only, not in real browsers.
- Dependencies: one runtime dependency, `cheerio`, for HTML parsing.

## Changelog

See [CHANGELOG.md](https://github.com/nithin-murali-arch/sri-js/blob/main/CHANGELOG.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
