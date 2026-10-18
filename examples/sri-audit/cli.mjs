#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { auditOutput } from "./audit.mjs";
import { formatText, makeReport } from "./report.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
let report;
try {
  const options = { exceptions: [] };
  let exceptionFile;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--json") continue;
    if (arg === "--help") {
      console.log(
        "Usage: sri-audit <output-directory> --base <https://example.test/app/> [--json] [--exceptions file.json]\nExceptions are an array of exact remote URL and reason objects. Valid supported integrity is still required.\nChecks local build bytes only. Remote bytes, module graphs, and runtime scripts are unverified.\nRejects all symlinks and malformed metadata tokens. This policy is stricter than browser tolerance.\nExits 0 for policy pass, 1 for findings, and 2 for invalid input or an incomplete operation.",
      );
      process.exit(0);
    }
    if (arg === "--base" || arg === "--exceptions") {
      const value = args[++index];
      if (!value || value.startsWith("--"))
        throw new Error(`${arg} requires a value.`);
      if (arg === "--base") {
        if (options.baseUrl) throw new Error("Duplicate --base.");
        options.baseUrl = value;
      } else {
        if (exceptionFile) throw new Error("Duplicate --exceptions.");
        exceptionFile = value;
      }
    } else if (arg.startsWith("-") || options.directory)
      throw new Error(`Unexpected argument ${arg}.`);
    else options.directory = arg;
  }
  if (exceptionFile)
    options.exceptions = JSON.parse(await readFile(exceptionFile, "utf8"));
  report = await auditOutput(options);
} catch (error) {
  report = makeReport({
    records: [
      {
        document: null,
        tagIndex: null,
        source: null,
        resolvedUrl: null,
        asset: null,
        algorithm: null,
        code: "INVALID_INPUT",
        status: "error",
        message: error.message,
      },
    ],
  });
}
process.stdout.write(
  json ? JSON.stringify(report, null, 2) + "\n" : formatText(report),
);
process.exitCode = report.exitCode;
