[![npm version](https://img.shields.io/npm/v/@nithin93/sri-js.svg)](https://www.npmjs.com/package/@nithin93/sri-js)
[![Build Status](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/min/@nithin93/sri-js)](https://bundlephobia.com/package/@nithin93/sri-js)

# SRI-JS

A modern TypeScript library for generating and enforcing Subresource Integrity (SRI) hashes for web resources. SRI-JS helps secure your client-side assets and meet compliance requirements such as PCI DSS by ensuring the integrity of your JavaScript and CSS files.

## Why SRI-JS?

- **Security First**: Prevents unauthorized modifications to your JavaScript and CSS files
- **PCI DSS Compliance**: Helps meet requirement 6.5.8 by ensuring the integrity of client-side resources
- **Zero Configuration**: Works out of the box with minimal setup
- **TypeScript Support**: Full type safety and modern development experience
- **Lightweight**: Uses native Node.js and browser APIs, no unnecessary dependencies

## Features

- Generate SRI hashes for JavaScript and CSS files
- Client-side enforcement of SRI using MutationObserver
- Support for dynamically added script tags
- Multiple hash algorithms (`sha256`, `sha384`, `sha512`)
- Automatic handling of relative and absolute paths
- TypeScript support with full type definitions

## Installation

```bash
npm install @nithin93/sri-js
```

## Quick Start

### 1. Generate SRI Hashes

Create a script in your project (e.g., `scripts/generate-sri.js`):

```javascript
const { generateSRI } = require("@nithin93/sri-js");
const fs = require("fs").promises;
const path = require("path");

async function generateHashes() {
  const generator = generateSRI({
    algorithm: "sha384", // Optional, defaults to 'sha384'
    basePath: "./dist", // Your build output directory
  });

  // Generate hashes for JS and CSS files
  const sriMap = await generator.generateForDirectory("./dist", [
    ".js",
    ".css",
  ]);

  // Write the map to a file
  await fs.writeFile(
    path.join("./dist", "sri-map.json"),
    JSON.stringify(sriMap, null, 2),
  );

  console.log("SRI hashes generated successfully!");
}

generateHashes().catch(console.error);
```

Add it to your `package.json`:

```json
{
  "scripts": {
    "generate-sri": "node scripts/generate-sri.js"
  }
}
```

Run it after your build:

```bash
npm run build && npm run generate-sri
```

### 2. Integrate with Your Application

#### For Next.js or Similar Frameworks

Read the SRI map during build time and inject it into your HTML:

```typescript
// In your build script or page generation
import fs from "fs";
import path from "path";

// Read the SRI map during build time
const sriMap = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "dist", "sri-map.json"), "utf-8"),
);

// Copy the client script to your public directory
fs.copyFileSync(
  path.join(process.cwd(), "node_modules/@nithin93/sri-js/dist/sri-client.js"),
  path.join(process.cwd(), "public/sri-client.js"),
);

// Inject into your HTML
const sriScript = `<script>window.SRI = { config: ${JSON.stringify(sriMap)} };</script>`;
const clientScript = '<script src="/sri-client.js"></script>';

// Add these scripts to your HTML before any other scripts
```

#### For Static HTML

If you're using a static site generator or plain HTML, you can inline the SRI map directly:

```html
<!-- Add these scripts before any other scripts in your HTML -->
<script>
  window.SRI = {
    config: {
      // This should match the sriMap generated while building
      "main.js": "sha384-abc123...",
      "vendor.js": "sha384-def456...",
      "styles.css": "sha384-ghi789...",
    },
  };
</script>
<script src="/sri-client.js"></script>
```

## How It Works

1. **Hash Generation**: During your build process, SRI-JS generates integrity hashes for all your JavaScript and CSS files.
2. **Map Creation**: The generated hashes are stored in a map that associates each file with its integrity hash.
3. **Build-time Integration**: The SRI map is read during build time and injected into your application.
4. **Runtime Enforcement**: The SRI-JS client script automatically:
   - Adds integrity attributes to all existing script tags
   - Monitors for dynamically added script tags using MutationObserver
   - Enforces SRI for all matching scripts

## API Reference

### Server-side

#### `generateSRI(options: SRIOptions): SRIGenerator`

Creates a new SRI generator instance.

Options:

- `algorithm`: Hash algorithm to use (`'sha256'`, `'sha384'`, or `'sha512'`). Default: `'sha384'`
- `basePath`: Base path for file resolution. Default: `process.cwd()`

#### `SRIGenerator.generateForDirectory(dirPath: string, extensions: string[]): Promise<SRIMap>`

Generates SRI hashes for all files with specified extensions in a directory.

Parameters:

- `dirPath`: Path to the directory containing files to hash
- `extensions`: Array of file extensions to process (e.g., `['.js', '.css']`)

Returns a map of filenames to their SRI hashes.

### Client-side

The client script automatically initializes when `window.SRI.config` is present. It will:

- Process all existing script tags
- Watch for new script tags using MutationObserver
- Add integrity and crossorigin attributes to matching scripts

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Run linter
npm run lint

# Format code
npm run format
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT
