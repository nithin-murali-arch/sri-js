# Audit script integrity after a build

Use this example to check the final HTML and JavaScript files that you plan to deploy. It resolves complete paths, so two files named `index.js` are checked independently. It reads files and never changes HTML or fetches remote scripts.

This is a private example package. Its tarball can be installed locally. No registry package is published by this workflow.

## Run the audit

Install the example dependencies from this directory.

```sh
npm ci
node cli.mjs /path/to/dist --base https://example.test/shop/
node cli.mjs /path/to/dist --base https://example.test/shop/ --json
```

Use the exact HTTP or HTTPS directory URL that maps to the output root. Keep the final slash. For example, `dist/docs/page.html` maps to `https://example.test/shop/docs/page.html`. The audit does not infer clean routes, redirects, or additional asset mounts.

Exit 0 means the configured policy passed. Exit 1 means the audit completed with findings. Exit 2 means invalid input or an incomplete operation, including unreadable files. Both formats include coverage limits. JSON uses the [versioned report schema](schema.md).

The audit selects classic JavaScript and module script elements with `src`. It reports explicit skips for inline scripts, import maps, speculation rules, data blocks, and inert template content. It checks only static external scripts. It does not inspect imported modules, bundler chunk graphs, runtime-created scripts, server rewrites, CSP, or compliance. Local verification concerns build bytes, not proof of the bytes a server serves.

SHA-512 takes priority over SHA-384, which takes priority over SHA-256. Any matching digest at the strongest supported algorithm passes. A weaker match cannot hide a stronger mismatch. The policy rejects malformed tokens, invalid digest lengths, and unsupported-only metadata. This is stricter than browser tolerance. All symlink files and directories are rejected, including links whose targets remain inside the output root.

## Accept a remote dependency explicitly

Keep valid supported integrity on the remote script. Write an exact resolved URL and a nonempty reason to `exceptions.json`.

```json
[
  {
    "url": "https://cdn.example.test/library/1.0.0/app.js",
    "reason": "Release review accepts remote bytes being verified separately."
  }
]
```

Run the audit with the exception file.

```sh
node cli.mjs /path/to/dist --base https://example.test/shop/ --exceptions exceptions.json
```

An accepted remote script remains `REMOTE_UNVERIFIED`. The exception accepts the inability to verify remote bytes. It does not waive missing or malformed integrity. URL query strings and fragments must match the exception exactly. Wildcards and origin prefixes are unsupported.

## Install the CLI from a tarball

Pack the example, then install its tarball into another project.

```sh
npm pack
cd /path/to/consumer
npm install /path/to/sri-output-audit-example-0.1.0.tgz
npx --no-install sri-audit ./dist --base https://example.test/shop/ --json
```

## Reproduce the verification

Install the root package dependencies before the example verification. From this directory, install Playwright Chromium and run the complete check.

```sh
npm ci --prefix ../..
npm ci
npx playwright install chromium
npm run verify
```

To use an installed Chrome locally, set its executable path.

```sh
SRI_AUDIT_BROWSER_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run verify
```

`npm run verify` runs the behavioral and CLI tests, builds and packs the root library, packs the example, and installs both tarballs in a temporary consumer outside the repository. It builds Vite output with integrity injected by the packed library and webpack output with `webpack-subresource-integrity`. It runs the installed CLI, appends one byte to each emitted script, and checks that the CLI fails. Native Chromium must execute each original build and block each altered script. Temporary files are removed afterward. Dependency installation needs registry access and browser verification needs local loopback access.

Browser agreement covers these valid metadata and mutation fixtures. It does not establish parity for every malformed token that this stricter policy rejects.
