# SRI audit report reference

`auditOutput({ directory, baseUrl, exceptions? })` returns a report. `directory` is a filesystem path. `baseUrl` is an absolute HTTP or HTTPS directory URL without credentials, query, or fragment. `exceptions` is an array of `{ url, reason }` objects. Exception URLs are unique canonical remote HTTP or HTTPS URLs. Reasons are nonempty strings.

The exported engine performs filesystem reads and returns the same report as the CLI. It does not write files or use network APIs. `report.mjs` contains the pure report reducer and text formatter.

| Report field | Value |
| --- | --- |
| `schemaVersion` | `1`. |
| `baseUrl` | Normalized deployment URL, or `null` for invalid input. |
| `documents` | Sorted output-relative HTML paths. HTML filenames are preserved exactly in document URLs. |
| `records` | Discovery records followed by document records in sorted document and parser source order. |
| `findings` | Records whose status is `finding` or `error`. |
| `summary` | HTML and external script counts, verified count, remote unverified count, accepted exception count, skip counts by reason, policy finding count, and operation error count. |
| `coverage` | Explicit checks, exclusions, and conservative policy statements. |
| `exitCode` | `0` for a policy pass, `1` for findings, or `2` for invalid input or incomplete I/O. Exit 2 takes precedence. |

Every record has the following fields. A field that does not apply is `null`.

| Record field | Value |
| --- | --- |
| `document` | Output-relative HTML path, or a rejected discovery entry. |
| `tagIndex` | One-based script element index within the parsed document, including skipped scripts. |
| `source` | Parser-decoded original `src`. |
| `resolvedUrl` | Complete resolved URL, including query and fragment. |
| `asset` | Output-relative local asset path without query or fragment. |
| `algorithm` | Strongest supported algorithm, when valid metadata is available. |
| `code` | Stable outcome code from the table below. |
| `status` | `verified`, `accepted`, `skipped`, `finding`, or `error`. |
| `message` | Human-readable explanation. Accepted exceptions include their reason. |

| Code | Meaning |
| --- | --- |
| `LOCAL_VERIFIED` | Local bytes match a digest at the strongest supported algorithm. |
| `REMOTE_UNVERIFIED` | Remote bytes were not fetched. Status is `accepted` with an exact exception and `finding` without one. |
| `MISSING_INTEGRITY` | Integrity is absent or blank. |
| `INVALID_INTEGRITY` | Malformed metadata, invalid digest encoding or length, or no supported digest. |
| `INTEGRITY_MISMATCH` | No strongest supported digest matches the local bytes. |
| `ASSET_MISSING` | A referenced local file or parent directory is missing. |
| `ASSET_NOT_FILE` | The local path does not identify a regular file. |
| `UNMAPPED_LOCAL_URL` | Same-origin URL lies outside the deployment directory prefix. |
| `PATH_ESCAPE` | Encoded separators, NUL, invalid percent encoding, or an escaping local path. |
| `SYMLINK_REJECTED` | A discovered or referenced symlink violates the reject-all-symlinks policy. |
| `AMBIGUOUS_BASE_ORDER` | The document's base elements have conflicting source and final DOM order. No selected script bytes in this document are verified. |
| `INVALID_BASE` | The first non-inert HTML `base[href]` encountered cannot resolve to HTTP or HTTPS. A later base is never substituted. |
| `INVALID_SCRIPT_URL` | Empty, unresolvable, or non-HTTP script URL. |
| `NO_HTML` | Output discovery found no HTML files. |
| `INVALID_INPUT` | Missing or invalid options, arguments, or exception configuration. Status is `error`. |
| `IO_ERROR` | Discovery or reading could not complete. Status is `error`. |
| `INLINE_SCRIPT` | Executable script without `src`, skipped. |
| `IMPORT_MAP` | Import map, skipped. |
| `SPECULATION_RULES` | Speculation rules, skipped. |
| `DATA_BLOCK` | Non-executable script type or language, skipped. |
| `INERT_TEMPLATE` | Script inside a template, skipped. |
| `FOREIGN_SCRIPT` | Non-HTML script element, skipped. |

URL resolution starts at the exact document filename. Elements are processed by parser source offsets, including malformed HTML whose final DOM tree has a different order. The first non-inert HTML base href affects only scripts encountered after it. An invalid first base produces a finding and prevents verification of later script URLs, while earlier scripts keep their document URL. Later bases never replace the first one in supported markup. If HTML parser recovery changes the order of base elements, the document receives AMBIGUOUS_BASE_ORDER findings and no selected script bytes are verified. This conservative limit avoids simulating browser parser state. Script-driven DOM or base changes are outside this static audit. Local mapping decodes each path segment once, rejects separators and NUL inside decoded segments, and checks filesystem confinement before reading. Query strings and fragments affect remote exception matching but never select different local bytes. Discovery accepts `.html` and `.htm` case-insensitively.

The metadata policy accepts SHA-256, SHA-384, and SHA-512 digests. Unsupported algorithm tokens are ignored when a valid supported token exists. Malformed tokens invalidate the complete metadata value. Syntactically valid optional SRI token options are tolerated but have no audit effect. The strongest supported group is selected before comparing bytes.
