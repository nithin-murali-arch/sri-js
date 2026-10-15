import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import webpack from "webpack";
import { chromium } from "playwright";

const example = dirname(fileURLToPath(import.meta.url));
const repository = resolve(example, "../..");
const temporary = await mkdtemp(join(tmpdir(), "sri-audit-packed-"));
const environment = {
  ...process.env,
  npm_config_cache:
    process.env.npm_config_cache ?? join(temporary, "npm-cache"),
};
delete environment.NODE_OPTIONS;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function command(binary, args, cwd) {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: environment,
  });
  assert.equal(
    result.status,
    0,
    `${binary} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}
function pack(directory) {
  const result = JSON.parse(
    command(
      npm,
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary],
      directory,
    ),
  );
  return join(temporary, result[0].filename);
}

async function serveOutput(directory) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://example.test").pathname;
      if (!pathname.startsWith("/shop/")) {
        response.writeHead(404).end();
        return;
      }
      const relativePath =
        decodeURIComponent(pathname.slice("/shop/".length)) || "index.html";
      if (relativePath.split("/").includes("..")) {
        response.writeHead(400).end();
        return;
      }
      response.setHeader(
        "Content-Type",
        extname(relativePath) === ".js" ? "text/javascript" : "text/html",
      );
      response.setHeader("Cache-Control", "no-store");
      response.end(await readFile(join(directory, relativePath)));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

let browser;
try {
  console.log(command(npm, ["test"], example).trim());
  command(npm, ["run", "build"], repository);
  const libraryTarball = pack(repository);
  const auditTarball = pack(example);
  const consumer = join(temporary, "consumer");
  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    '{"name":"packed-audit-consumer","private":true}',
  );
  command(
    npm,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      libraryTarball,
      auditTarball,
    ],
    consumer,
  );
  const requireConsumer = createRequire(join(consumer, "package.json"));
  const sri = requireConsumer("@nithin93/sri-js");
  const installedCli = join(
    consumer,
    "node_modules/.bin",
    process.platform === "win32" ? "sri-audit.cmd" : "sri-audit",
  );
  function audit(directory, expectedExit) {
    const result = spawnSync(
      installedCli,
      [directory, "--base", "http://example.test/shop/", "--json"],
      { cwd: consumer, encoding: "utf8", env: environment },
    );
    assert.equal(result.status, expectedExit, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SRI_AUDIT_BROWSER_EXECUTABLE
      ? { executablePath: process.env.SRI_AUDIT_BROWSER_EXECUTABLE }
      : {}),
  });
  console.log(
    `Browser ${browser.version()}. Packed CLI installed outside the repository.`,
  );
  const viteOutput = join(temporary, "vite-output");
  await build({
    configFile: false,
    root: join(example, "fixtures/vite"),
    base: "/shop/",
    logLevel: "error",
    build: { outDir: viteOutput, emptyOutDir: true, modulePreload: false },
  });
  const hashes = await sri
    .generateSRI({ algorithm: "sha384", basePath: viteOutput })
    .generateForDirectory([".js"]);
  const viteHtml = join(viteOutput, "index.html");
  await writeFile(
    viteHtml,
    sri.updateHTML(await readFile(viteHtml, "utf8"), hashes),
  );
  const requireHere = createRequire(import.meta.url);
  const webpackConfig = requireHere("./fixtures/webpack/webpack.config.cjs");
  const webpackOutput = join(temporary, "webpack-output");
  const compiler = webpack({
    ...webpackConfig,
    output: { ...webpackConfig.output, path: webpackOutput },
  });
  await new Promise((done, reject) =>
    compiler.run((error, stats) =>
      compiler.close((closeError) => {
        if (error || closeError || stats?.hasErrors())
          reject(
            error ?? closeError ?? new Error(stats.toString("errors-only")),
          );
        else done();
      }),
    ),
  );
  for (const [name, directory] of [
    ["vite", viteOutput],
    ["webpack", webpackOutput],
  ]) {
    const passed = audit(directory, 0);
    assert.equal(passed.summary.verified, 1);
    assert.deepEqual(passed.findings, []);
    const asset = passed.records.find(
      (item) => item.code === "LOCAL_VERIFIED",
    ).asset;
    const { server, origin } = await serveOutput(directory);
    try {
      const validPage = await browser.newPage();
      await validPage.goto(`${origin}/shop/index.html`);
      assert.equal(
        await validPage.evaluate(() => window.sriAuditExecuted),
        name,
      );
      await validPage.close();
      const assetPath = join(directory, asset);
      const original = await readFile(assetPath);
      await writeFile(assetPath, Buffer.concat([original, Buffer.from(" ")]));
      const failed = audit(directory, 1);
      assert.deepEqual(
        failed.findings.map((item) => item.code),
        ["INTEGRITY_MISMATCH"],
      );
      const blockedPage = await browser.newPage();
      const nativeErrors = [];
      blockedPage.on("console", (message) => {
        if (message.type() === "error") nativeErrors.push(message.text());
      });
      await blockedPage.goto(`${origin}/shop/index.html`);
      assert.equal(
        await blockedPage.evaluate(() => window.sriAuditExecuted),
        undefined,
      );
      assert.ok(
        nativeErrors.some((message) => /integrity|digest/i.test(message)),
        "Chrome reports an integrity error.",
      );
      await blockedPage.close();
      await writeFile(assetPath, original);
      console.log(
        `${name}: installed CLI passed final output, rejected a one-byte mutation, and Chrome executed valid bytes and blocked tampered bytes.`,
      );
    } finally {
      await new Promise((done) => server.close(done));
    }
  }
  const baseOrderOutput = join(temporary, "base-order-output");
  await mkdir(join(baseOrderOutput, "assets"), { recursive: true });
  await mkdir(join(baseOrderOutput, "other/assets"), { recursive: true });
  const baseOrderBytes = "window.sriAuditBaseOrderExecuted = true;";
  const baseOrderIntegrity = sri
    .generateSRI({ algorithm: "sha384" })
    .generateHash(Buffer.from(baseOrderBytes));
  const baseOrderScript = `<script src="assets/app.js" integrity="${baseOrderIntegrity}"></script>`;
  await writeFile(join(baseOrderOutput, "assets/app.js"), baseOrderBytes + " ");
  await writeFile(join(baseOrderOutput, "other/assets/app.js"), baseOrderBytes);
  await writeFile(
    join(baseOrderOutput, "index.html"),
    baseOrderScript + '<base href="/shop/other/">',
  );
  await writeFile(
    join(baseOrderOutput, "after.html"),
    '<base href="/shop/other/">' + baseOrderScript,
  );
  await writeFile(
    join(baseOrderOutput, "foster.html"),
    "<table>" + baseOrderScript + '<base href="/shop/other/"></table>',
  );
  await mkdir(join(baseOrderOutput, "one/assets"), { recursive: true });
  await mkdir(join(baseOrderOutput, "two/assets"), { recursive: true });
  await writeFile(join(baseOrderOutput, "one/assets/app.js"), baseOrderBytes);
  await writeFile(
    join(baseOrderOutput, "two/assets/app.js"),
    baseOrderBytes + " ",
  );
  await writeFile(
    join(baseOrderOutput, "multi.html"),
    '<table><tr><td><base href="/shop/one/"></td></tr><base href="/shop/two/">' +
      baseOrderScript +
      "</table>",
  );
  const baseOrderReport = audit(baseOrderOutput, 1);
  assert.deepEqual(
    baseOrderReport.records.map(({ document, code, asset }) => ({
      document,
      code,
      asset,
    })),
    [
      {
        document: "after.html",
        code: "LOCAL_VERIFIED",
        asset: "other/assets/app.js",
      },
      {
        document: "foster.html",
        code: "INTEGRITY_MISMATCH",
        asset: "assets/app.js",
      },
      {
        document: "index.html",
        code: "INTEGRITY_MISMATCH",
        asset: "assets/app.js",
      },
      { document: "multi.html", code: "AMBIGUOUS_BASE_ORDER", asset: null },
      { document: "multi.html", code: "AMBIGUOUS_BASE_ORDER", asset: null },
    ],
  );
  const { server: orderServer, origin: orderOrigin } =
    await serveOutput(baseOrderOutput);
  try {
    for (const document of ["index.html", "foster.html", "multi.html"]) {
      const earlyPage = await browser.newPage();
      const errors = [];
      const scriptRequests = [];
      earlyPage.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      earlyPage.on("request", (request) => {
        if (request.resourceType() === "script")
          scriptRequests.push(new URL(request.url()).pathname);
      });
      await earlyPage.goto(`${orderOrigin}/shop/${document}`);
      if (document === "multi.html") {
        assert.ok(scriptRequests.includes("/shop/two/assets/app.js"));
        assert.ok(
          errors.some(
            (message) =>
              message.includes("/shop/two/assets/app.js") &&
              /integrity|digest/i.test(message),
          ),
        );
      } else assert.deepEqual(scriptRequests, ["/shop/assets/app.js"]);
      assert.equal(
        await earlyPage.evaluate(() => window.sriAuditBaseOrderExecuted),
        undefined,
      );
      assert.ok(
        errors.some((message) => /integrity|digest/i.test(message)),
        "Chrome blocks the earlier tampered script.",
      );
      await earlyPage.close();
    }
    const latePage = await browser.newPage();
    await latePage.goto(`${orderOrigin}/shop/after.html`);
    assert.equal(
      await latePage.evaluate(() => window.sriAuditBaseOrderExecuted),
      true,
    );
    await latePage.close();
    console.log(
      "base order: installed CLI rejected earlier tampered assets/app.js in ordinary and foster-parented HTML, verified other/assets/app.js after the base, and Chrome requested and blocked the earlier bytes in both pages. Conflicting multiple bases produce an explicit ambiguity finding while Chrome blocks the actual two/assets/app.js bytes.",
    );
  } finally {
    await new Promise((done) => orderServer.close(done));
  }
  console.log(
    "Verification passed. Remote responses, module graphs, runtime scripts, and server transformations remain outside coverage.",
  );
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
