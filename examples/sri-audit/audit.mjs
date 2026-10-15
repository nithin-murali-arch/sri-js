import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse } from "parse5";
import { makeReport } from "./report.mjs";

const algorithms = { sha256: 32, sha384: 48, sha512: 64 };
const scriptTypes = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
]);
const asciiTrim = (value) => value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");
const posix = (value) => value.split(sep).join("/");
const contained = (root, file) => {
  const path = relative(root, file);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
};
const record = (code, status, message, location = {}) => ({
  document: null,
  tagIndex: null,
  source: null,
  resolvedUrl: null,
  asset: null,
  algorithm: null,
  code,
  status,
  message,
  ...location,
});

function integrityMetadata(value) {
  if (!value || !asciiTrim(value))
    return {
      code: "MISSING_INTEGRITY",
      message: "Integrity metadata is missing or blank.",
    };
  const supported = [];
  for (const token of asciiTrim(value).split(/[\t\n\f\r ]+/)) {
    const match =
      /^([a-zA-Z0-9]+)-([A-Za-z0-9+/_-]+={0,2})(?:\?[\x21-\x7e]+)?$/.exec(
        token,
      );
    if (!match)
      return {
        code: "INVALID_INTEGRITY",
        message: "Integrity metadata contains a malformed token.",
      };
    const algorithm = match[1].toLowerCase();
    if (!Object.hasOwn(algorithms, algorithm)) continue;
    const normalized = match[2].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Buffer.from(normalized, "base64");
    if (
      bytes.length !== algorithms[algorithm] ||
      bytes.toString("base64").replace(/=+$/, "") !==
        normalized.replace(/=+$/, "") ||
      (normalized.includes("=") && normalized.length % 4 !== 0)
    ) {
      return {
        code: "INVALID_INTEGRITY",
        message: `Integrity metadata has an invalid ${algorithm} digest.`,
      };
    }
    supported.push({ algorithm, digest: bytes.toString("base64") });
  }
  if (!supported.length)
    return {
      code: "INVALID_INTEGRITY",
      message:
        "Integrity metadata has no supported SHA-256, SHA-384, or SHA-512 digest.",
    };
  const algorithm = supported.reduce(
    (best, item) =>
      algorithms[item.algorithm] > algorithms[best] ? item.algorithm : best,
    "sha256",
  );
  return {
    algorithm,
    digests: supported
      .filter((item) => item.algorithm === algorithm)
      .map((item) => item.digest),
  };
}

function elements(node, inert = false, output = []) {
  if (node.tagName) output.push({ node, inert });
  for (const child of node.childNodes ?? []) elements(child, inert, output);
  if (node.content) elements(node.content, true, output);
  return output;
}

function inputOptions(options) {
  if (
    !options ||
    typeof options.directory !== "string" ||
    !options.directory.trim()
  )
    throw new Error("An output directory is required.");
  const base = new URL(options.baseUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !base.pathname.endsWith("/")
  )
    throw new Error(
      "Base URL must be an absolute HTTP(S) directory URL without credentials, query, or fragment.",
    );
  if (!Array.isArray(options.exceptions ?? []))
    throw new Error(
      "Exceptions must be an array of exact URL and reason objects.",
    );
  const exceptions = new Map();
  for (const item of options.exceptions ?? []) {
    if (
      !item ||
      typeof item.url !== "string" ||
      typeof item.reason !== "string" ||
      !item.reason.trim()
    )
      throw new Error(
        "Every exception needs an exact remote URL and a nonempty reason.",
      );
    const url = new URL(item.url);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin === base.origin ||
      url.href !== item.url ||
      exceptions.has(item.url)
    )
      throw new Error(
        "Exception URLs must be unique canonical remote HTTP(S) URLs.",
      );
    exceptions.set(item.url, item.reason.trim());
  }
  return { root: resolve(options.directory), base, exceptions };
}

async function safePath(root, file) {
  if (!contained(root, file)) return "PATH_ESCAPE";
  let current = root;
  for (const part of relative(root, file).split(sep).filter(Boolean)) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) return "SYMLINK_REJECTED";
  }
  return contained(root, await realpath(file)) ? null : "PATH_ESCAPE";
}

export async function auditOutput(options) {
  const records = [];
  const documents = [];
  let config;
  try {
    config = inputOptions(options);
  } catch (error) {
    return makeReport({
      records: [record("INVALID_INPUT", "error", error.message)],
    });
  }
  let { root } = config;
  const { base, exceptions } = config;
  const report = () => makeReport({ baseUrl: base.href, documents, records });
  try {
    const info = await lstat(root);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new Error(
        "Output root must be a directory and must not be a symlink.",
      );
    root = await realpath(root);
    async function walk(directory) {
      const entries = (await readdir(directory, { withFileTypes: true })).sort(
        (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
      );
      for (const entry of entries) {
        const file = join(directory, entry.name);
        if (entry.isSymbolicLink())
          records.push(
            record(
              "SYMLINK_REJECTED",
              "finding",
              "Symlinks are outside this audit policy.",
              { document: posix(relative(root, file)) },
            ),
          );
        else if (entry.isDirectory()) await walk(file);
        else if (entry.isFile() && /\.html?$/i.test(entry.name))
          documents.push(posix(relative(root, file)));
      }
    }
    await walk(root);
  } catch (error) {
    records.push(
      record(
        "IO_ERROR",
        "error",
        `Cannot discover output HTML (${error.code ?? error.message}).`,
      ),
    );
    return report();
  }
  documents.sort();
  if (!documents.length)
    records.push(record("NO_HTML", "finding", "No HTML files were found."));
  for (const document of documents) {
    let tree;
    const htmlFile = join(root, document);
    try {
      const unsafe = await safePath(root, htmlFile);
      if (unsafe) {
        records.push(
          record(unsafe, "finding", "HTML path is not permitted.", {
            document,
          }),
        );
        continue;
      }
      tree = parse(await readFile(htmlFile, "utf8"));
    } catch (error) {
      records.push(
        record(
          "IO_ERROR",
          "error",
          `Cannot read HTML (${error.code ?? "parse failure"}).`,
          { document },
        ),
      );
      continue;
    }
    const nodes = elements(tree);
    const documentUrl = new URL(
      document.split("/").map(encodeURIComponent).join("/"),
      base,
    );
    let effectiveBase = documentUrl;
    const baseNode = nodes.find(
      ({ node, inert }) =>
        !inert &&
        node.namespaceURI === "http://www.w3.org/1999/xhtml" &&
        node.tagName === "base" &&
        node.attrs.some((attr) => attr.name === "href"),
    );
    if (baseNode) {
      try {
        effectiveBase = new URL(
          baseNode.node.attrs.find((attr) => attr.name === "href").value,
          documentUrl,
        );
        if (!["http:", "https:"].includes(effectiveBase.protocol))
          throw new Error("unsupported base");
      } catch {
        records.push(
          record(
            "INVALID_BASE",
            "finding",
            "The first base href cannot resolve to an HTTP(S) URL.",
            { document },
          ),
        );
        effectiveBase = null;
      }
    }
    let tagIndex = 0;
    for (const { node, inert } of nodes.filter(
      ({ node }) => node.tagName === "script",
    )) {
      tagIndex++;
      const attrs = Object.fromEntries(
        node.attrs.map(({ name, value }) => [name, value]),
      );
      const location = { document, tagIndex, source: attrs.src ?? null };
      const type = asciiTrim(attrs.type ?? "").toLowerCase();
      const language = asciiTrim(attrs.language ?? "").toLowerCase();
      const executable =
        type === "module" ||
        scriptTypes.has(type) ||
        (!type &&
          (Object.hasOwn(attrs, "type") ||
            !language ||
            scriptTypes.has(`text/${language}`)));
      const skip =
        node.namespaceURI !== "http://www.w3.org/1999/xhtml"
          ? "FOREIGN_SCRIPT"
          : inert
            ? "INERT_TEMPLATE"
            : type === "importmap"
              ? "IMPORT_MAP"
              : type === "speculationrules"
                ? "SPECULATION_RULES"
                : !executable
                  ? "DATA_BLOCK"
                  : !Object.hasOwn(attrs, "src")
                    ? "INLINE_SCRIPT"
                    : null;
      if (skip) {
        records.push(
          record(
            skip,
            "skipped",
            "This script is outside executable external-script coverage.",
            location,
          ),
        );
        continue;
      }
      if (!effectiveBase) {
        records.push(
          record(
            "INVALID_BASE",
            "finding",
            "Script URL cannot be audited because the first base href is invalid.",
            location,
          ),
        );
        continue;
      }
      let url;
      try {
        if (!asciiTrim(attrs.src)) throw new Error("empty src");
        url = new URL(attrs.src, effectiveBase);
        if (!["http:", "https:"].includes(url.protocol))
          throw new Error("unsupported script scheme");
      } catch {
        records.push(
          record(
            "INVALID_SCRIPT_URL",
            "finding",
            "Script src must resolve to a nonempty HTTP(S) URL.",
            location,
          ),
        );
        continue;
      }
      location.resolvedUrl = url.href;
      const metadata = integrityMetadata(attrs.integrity);
      if (metadata.code) {
        records.push(
          record(metadata.code, "finding", metadata.message, location),
        );
        continue;
      }
      location.algorithm = metadata.algorithm;
      if (url.origin !== base.origin) {
        const reason = exceptions.get(url.href);
        records.push(
          record(
            "REMOTE_UNVERIFIED",
            reason ? "accepted" : "finding",
            reason
              ? `Remote bytes were not fetched. Accepted exception: ${reason}`
              : "Remote bytes were not fetched. An exact URL exception with a reason is required.",
            location,
          ),
        );
        continue;
      }
      if (!url.pathname.startsWith(base.pathname)) {
        records.push(
          record(
            "UNMAPPED_LOCAL_URL",
            "finding",
            "Same-origin script is outside the deployment directory URL.",
            location,
          ),
        );
        continue;
      }
      let asset;
      try {
        const segments = url.pathname
          .slice(base.pathname.length)
          .split("/")
          .map((segment) => decodeURIComponent(segment));
        if (
          segments.some(
            (segment) =>
              segment === "." || segment === ".." || /[/\\\0]/.test(segment),
          )
        )
          throw new Error("unsafe URL path");
        asset = resolve(root, ...segments);
        if (!contained(root, asset)) throw new Error("escaped root");
      } catch {
        records.push(
          record(
            "PATH_ESCAPE",
            "finding",
            "Script path has ambiguous encoding or escapes the output root.",
            location,
          ),
        );
        continue;
      }
      location.asset = posix(relative(root, asset));
      try {
        const unsafe = await safePath(root, asset);
        if (unsafe) {
          records.push(
            record(
              unsafe,
              "finding",
              "Script path is not permitted.",
              location,
            ),
          );
          continue;
        }
        if (!(await lstat(asset)).isFile()) {
          records.push(
            record(
              "ASSET_NOT_FILE",
              "finding",
              "Script path does not identify a regular file.",
              location,
            ),
          );
          continue;
        }
        const bytes = await readFile(asset);
        const actual = createHash(metadata.algorithm)
          .update(bytes)
          .digest("base64");
        records.push(
          record(
            metadata.digests.includes(actual)
              ? "LOCAL_VERIFIED"
              : "INTEGRITY_MISMATCH",
            metadata.digests.includes(actual) ? "verified" : "finding",
            metadata.digests.includes(actual)
              ? "Local bytes match the strongest supported integrity metadata."
              : "Local bytes do not match any digest at the strongest supported algorithm.",
            location,
          ),
        );
      } catch (error) {
        records.push(
          record(
            error.code === "ENOENT" || error.code === "ENOTDIR"
              ? "ASSET_MISSING"
              : "IO_ERROR",
            error.code === "ENOENT" || error.code === "ENOTDIR"
              ? "finding"
              : "error",
            error.code === "ENOENT" || error.code === "ENOTDIR"
              ? "Referenced local asset was not found."
              : `Cannot read local asset (${error.code ?? "unknown error"}).`,
            location,
          ),
        );
      }
    }
  }
  return report();
}
