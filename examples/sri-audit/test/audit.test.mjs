import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { auditOutput } from "../audit.mjs";
import { formatText } from "../report.mjs";

const baseUrl = "https://example.test/shop/";
const bytes = "window.sriAuditExecuted = true;\n";
const hash = (value = bytes, algorithm = "sha384") =>
  `${algorithm}-${createHash(algorithm).update(value).digest("base64")}`;
const script = (src, integrity = hash(), extra = "") =>
  `<script src="${src}" integrity="${integrity}" ${extra}></script>`;
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

async function fixture(t, files) {
  const root = await mkdtemp(join(tmpdir(), "sri-audit-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, value] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), value);
  }
  return root;
}
const codes = (result) => result.findings.map((item) => item.code);
const run = (root, ...args) =>
  spawnSync(
    process.execPath,
    [cli, root, "--base", baseUrl, "--json", ...args],
    { encoding: "utf8" },
  );

test("full paths, nested documents, duplicate basenames, base href, and queries verify independently", async (t) => {
  const other = "window.other = true;";
  const root = await fixture(t, {
    "a/index.js": bytes,
    "b/index.js": other,
    "index.html":
      script("/shop/a/index.js?v=2#start") + script("b/index.js", hash(other)),
    "nested/page.html":
      '<base href="../b/"><base href="/wrong/">' +
      script("index.js?cache=1", hash(other)),
  });
  const before = await readFile(join(root, "index.html"), "utf8");
  const result = await auditOutput({ directory: root, baseUrl });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.documents, ["index.html", "nested/page.html"]);
  assert.deepEqual(
    result.records.map((item) => item.asset),
    ["a/index.js", "b/index.js", "b/index.js"],
  );
  assert.equal(result.summary.verified, 3);
  assert.equal(await readFile(join(root, "index.html"), "utf8"), before);
  assert.equal(run(root).status, 0);
  assert.equal(run(root).stdout, run(root).stdout);
});

test("strongest supported hash wins and any digest at that strength may match", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes,
    "index.html": script(
      "app.js",
      `${hash(bytes, "sha256")} ${hash("bad", "sha512")}`,
    ),
  });
  assert.deepEqual(codes(await auditOutput({ directory: root, baseUrl })), [
    "INTEGRITY_MISMATCH",
  ]);
  await writeFile(
    join(root, "index.html"),
    script(
      "app.js",
      `${hash("bad", "sha512")} ${hash(bytes, "sha512")} ${hash("bad", "sha384")}`,
    ),
  );
  assert.equal((await auditOutput({ directory: root, baseUrl })).exitCode, 0);
});

test("missing, blank, malformed, wrong-length, and unsupported-only metadata cannot verify", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes,
    "index.html":
      '<script src="app.js"></script>' +
      script("app.js", " ") +
      script("app.js", "sha384-%%%") +
      script("app.js", "sha512-YQ==") +
      script("app.js", "sha1-YQ==") +
      script("app.js", `${hash()} sha512-bad`),
  });
  const result = await auditOutput({ directory: root, baseUrl });
  assert.deepEqual(codes(result), [
    "MISSING_INTEGRITY",
    "MISSING_INTEGRITY",
    "INVALID_INTEGRITY",
    "INVALID_INTEGRITY",
    "INVALID_INTEGRITY",
    "INVALID_INTEGRITY",
  ]);
  assert.equal(result.summary.verified, 0);
  assert.equal(result.exitCode, 1);
  assert.equal(run(root).status, 1);
});

test("mutation, missing files, empty src, and script schemes fail with literal codes", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes + " ",
    "index.html":
      script("app.js") +
      script("missing.js") +
      script("") +
      script("data:text/javascript,alert(1)"),
  });
  assert.deepEqual(codes(await auditOutput({ directory: root, baseUrl })), [
    "INTEGRITY_MISMATCH",
    "ASSET_MISSING",
    "INVALID_SCRIPT_URL",
    "INVALID_SCRIPT_URL",
  ]);
});

test("deployment prefix, encoded separators and traversal cannot read outside root", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes,
    "index.html":
      script("/shopping/app.js") +
      script("../app.js") +
      script("/shop/%2e%2e/app.js") +
      script("/shop/a%2fapp.js") +
      script("/shop/%00.js") +
      script("/shop/%xx.js"),
  });
  assert.deepEqual(codes(await auditOutput({ directory: root, baseUrl })), [
    "UNMAPPED_LOCAL_URL",
    "UNMAPPED_LOCAL_URL",
    "UNMAPPED_LOCAL_URL",
    "PATH_ESCAPE",
    "PATH_ESCAPE",
    "PATH_ESCAPE",
  ]);
});

test("first invalid base is a failure and later base is never used", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes,
    "index.html":
      '<base href="http://["><base href="/shop/">' + script("app.js"),
  });
  const result = await auditOutput({ directory: root, baseUrl });
  assert.deepEqual(codes(result), ["INVALID_BASE", "INVALID_BASE"]);
  assert.equal(result.summary.verified, 0);
});

test("remote exceptions retain unverified status and never waive metadata checks", async (t) => {
  const url = "https://cdn.example.test/app.js?v=1#x";
  const root = await fixture(t, { "index.html": script(url) });
  const options = {
    directory: root,
    baseUrl,
    exceptions: [{ url, reason: "Vendor bytes reviewed separately." }],
  };
  const passed = await auditOutput(options);
  assert.equal(passed.exitCode, 0);
  assert.equal(passed.summary.verified, 0);
  assert.equal(passed.summary.remoteUnverified, 1);
  assert.equal(passed.records[0].status, "accepted");
  assert.deepEqual(
    codes(
      await auditOutput({
        ...options,
        exceptions: [{ url: url.replace("v=1", "v=2"), reason: "Other URL." }],
      }),
    ),
    ["REMOTE_UNVERIFIED"],
  );
  await writeFile(join(root, "index.html"), script(url, "sha384-bad"));
  assert.deepEqual(codes(await auditOutput(options)), ["INVALID_INTEGRITY"]);
  await writeFile(join(root, "index.html"), `<script src="${url}"></script>`);
  assert.deepEqual(codes(await auditOutput(options)), ["MISSING_INTEGRITY"]);
  assert.equal(
    (await auditOutput({ ...options, exceptions: [{ url, reason: "" }] }))
      .exitCode,
    2,
  );
});

test("parser recovery, executable types, and inert skips are explicit", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes,
    "index.html":
      "<!doctype html><title>broken &lt;script&gt;</title><template>" +
      script("ignored.js") +
      '</template><script>let x = 1;</script><script type="importmap">{}</script><script type="speculationrules">{}</script><script type="application/json" src="missing.js">{}</script>' +
      script("app.js", hash(), 'type="MoDuLe"') +
      script("app.js", hash(), 'type="text/javascript" nomodule') +
      script("app.js", hash(), 'language="javascript"') +
      script("app.js", hash(), 'type="" language="json"'),
  });
  const result = await auditOutput({ directory: root, baseUrl });
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary.verified, 4);
  assert.deepEqual(result.summary.skippedByReason, {
    INERT_TEMPLATE: 1,
    INLINE_SCRIPT: 1,
    IMPORT_MAP: 1,
    SPECULATION_RULES: 1,
    DATA_BLOCK: 1,
  });
  assert.match(formatText(result), /module graphs or runtime-created scripts/);
});

test("symlink files and directories are rejected even when their targets are inside root", async (t) => {
  const root = await fixture(t, {
    "app.js": bytes,
    "nested/page.html": script("../app.js"),
    "index.html": script("alias.js"),
  });
  await symlink(join(root, "app.js"), join(root, "alias.js"));
  await symlink(join(root, "nested"), join(root, "alias-dir"));
  await symlink(tmpdir(), join(root, "outside"));
  const result = await auditOutput({ directory: root, baseUrl });
  assert.equal(result.exitCode, 1);
  assert.equal(
    result.findings.filter((item) => item.code === "SYMLINK_REJECTED").length,
    4,
  );
  assert.equal(result.summary.verified, 1);
});

test("invalid input and operation failures use exit 2, with structured CLI output", async (t) => {
  const root = await fixture(t, { "index.html": script("missing.js") });
  for (const invalid of [
    "https://example.test/shop",
    "file:///tmp/",
    "https://user:pass@example.test/",
    "https://example.test/?x=1",
  ]) {
    assert.equal(
      (await auditOutput({ directory: root, baseUrl: invalid })).exitCode,
      2,
    );
  }
  assert.equal(
    (await auditOutput({ directory: join(root, "absent"), baseUrl })).exitCode,
    2,
  );
  const invocation = run(root, "--unknown");
  assert.equal(invocation.status, 2);
  assert.deepEqual(codes(JSON.parse(invocation.stdout)), ["INVALID_INPUT"]);
  const empty = await fixture(t, {});
  assert.deepEqual(codes(await auditOutput({ directory: empty, baseUrl })), [
    "NO_HTML",
  ]);
  if (process.getuid?.() !== 0) {
    await writeFile(join(root, "secret.js"), bytes);
    await writeFile(
      join(root, "index.html"),
      script("missing.js") + script("secret.js"),
    );
    await chmod(join(root, "secret.js"), 0);
    t.after(() => chmod(join(root, "secret.js"), 0o600).catch(() => {}));
    const result = await auditOutput({ directory: root, baseUrl });
    assert.equal(result.exitCode, 2);
    assert.deepEqual(codes(result), ["ASSET_MISSING", "IO_ERROR"]);
    assert.equal(run(root).status, 2);
  }
});

test('a later base cannot redirect an earlier script away from tampered bytes', async (t) => {
  const root = await fixture(t, {
    'assets/app.js': bytes + ' ',
    'other/assets/app.js': bytes,
    'index.html': script('assets/app.js') + '<base href="/shop/other/">' + script('assets/app.js'),
  });
  const result = await auditOutput({ directory: root, baseUrl });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.records.map((item) => ({ code: item.code, asset: item.asset })), [
    { code: 'INTEGRITY_MISMATCH', asset: 'assets/app.js' },
    { code: 'LOCAL_VERIFIED', asset: 'other/assets/app.js' },
  ]);
  assert.equal(run(root).status, 1);
});

test('an invalid later first base affects only following scripts and never falls back to another base', async (t) => {
  const root = await fixture(t, {
    'app.js': bytes,
    'index.html': script('app.js') + '<base href="http://["><base href="/shop/">' + script('app.js'),
  });
  const result = await auditOutput({ directory: root, baseUrl });
  assert.deepEqual(result.records.map((item) => item.code), ['LOCAL_VERIFIED', 'INVALID_BASE', 'INVALID_BASE']);
  assert.equal(result.records[0].asset, 'app.js');
  assert.equal(result.summary.verified, 1);
  assert.equal(result.exitCode, 1);
});
