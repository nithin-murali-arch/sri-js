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
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
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
  console.log(
    "Verification passed. Remote responses, module graphs, runtime scripts, and server transformations remain outside coverage.",
  );
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
