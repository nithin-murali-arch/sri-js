export const coverageBoundary = [
  "Checks static executable external script elements against local build bytes.",
  "Does not fetch remote scripts, inspect module graphs or runtime-created scripts, or prove served bytes.",
  "Rejects all symlinks and malformed integrity tokens, which is stricter than browser tolerance.",
];

export function makeReport({
  baseUrl = null,
  documents = [],
  records = [],
} = {}) {
  const findings = records.filter(
    (record) => record.status === "finding" || record.status === "error",
  );
  const skippedByReason = {};
  for (const record of records.filter((item) => item.status === "skipped")) {
    skippedByReason[record.code] = (skippedByReason[record.code] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    baseUrl,
    documents,
    records,
    findings,
    summary: {
      htmlFiles: documents.length,
      externalScripts: records.filter(
        (item) => item.tagIndex !== null && item.status !== "skipped",
      ).length,
      verified: records.filter((item) => item.status === "verified").length,
      remoteUnverified: records.filter(
        (item) => item.code === "REMOTE_UNVERIFIED",
      ).length,
      acceptedExceptions: records.filter((item) => item.status === "accepted")
        .length,
      skippedByReason,
      policyFindings: findings.filter((item) => item.status === "finding")
        .length,
      operationErrors: findings.filter((item) => item.status === "error")
        .length,
    },
    coverage: coverageBoundary,
    exitCode: findings.some((item) => item.status === "error")
      ? 2
      : findings.length
        ? 1
        : 0,
  };
}

export function formatText(report) {
  const lines = [
    `SRI audit ${report.exitCode === 0 ? "passed" : report.exitCode === 1 ? "found policy failures" : "could not complete"}.`,
  ];
  for (const record of report.records) {
    const where = record.document
      ? `${record.document}${record.tagIndex ? ` script ${record.tagIndex}` : ""}`
      : "input";
    lines.push(
      `${record.code} ${where}${record.source === null ? "" : ` ${JSON.stringify(record.source)}`}${record.asset ? ` => ${record.asset}` : ""}: ${record.message}`,
    );
  }
  lines.push(
    `HTML ${report.summary.htmlFiles}; verified ${report.summary.verified}; remote unverified ${report.summary.remoteUnverified}; exceptions ${report.summary.acceptedExceptions}; findings ${report.summary.policyFindings}; errors ${report.summary.operationErrors}.`,
  );
  lines.push(`Skipped ${JSON.stringify(report.summary.skippedByReason)}.`);
  lines.push(...report.coverage);
  return lines.join("\n") + "\n";
}
