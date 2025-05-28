[![npm version](https://img.shields.io/npm/v/@nithin93/sri-js.svg)](https://www.npmjs.com/package/@nithin93/sri-js)
[![Build Status](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/min/@nithin93/sri-js)](https://bundlephobia.com/package/@nithin93/sri-js)

# SRI-JS

A lightweight library to enforce Subresource Integrity (SRI) for dynamically loaded scripts in the browser and to update script tags in HTML using Cheerio.

## Why SRI?

Subresource Integrity (SRI) is a security feature that enables browsers to verify that resources they fetch (for example, from a CDN) are delivered without unexpected manipulation. It works by allowing you to provide a cryptographic hash that a fetched resource must match.

### Benefits

- **Security**: Ensures that the resources you load are exactly the ones you expect, preventing tampering.
- **Compliance**: Helps meet security standards like PCI DSS by ensuring the integrity of client-side resources.
- **Trust**: Builds trust with your users by ensuring that the resources are secure.

## Features

- **Browser Integration**: Automatically adds integrity attributes to dynamically created script tags.
- **HTML Processing**: Update existing script tags in HTML using Cheerio.
- **Zero Dependencies**: Lightweight and easy to integrate.
- **TypeScript Support**: Fully typed for better developer experience.

## Installation

```bash
npm install @nithin93/sri-js
```

## Usage

### Browser Integration

Include the library in your HTML:

```html
<script src="path/to/sri-js.js"></script>
<script>
  window.SRI = {
    config: {
      "script1.js": "sha384-hash1",
      "script2.js": "sha384-hash2"
    }
  };
</script>
```

The library will automatically add integrity attributes to any dynamically created script tags.

### HTML Processing with Cheerio

```typescript
import { updateHTML } from '@nithin93/sri-js';

const html = '<script src="script1.js"></script>';
const config = {
  "script1.js": "sha384-hash1"
};

const updatedHtml = updateHTML(html, config);
console.log(updatedHtml);
// Output: <script src="script1.js" integrity="sha384-hash1" crossorigin="anonymous"></script>
```

### Advanced Example: Using with a Build Tool

If you're using a build tool like Webpack, you can integrate SRI-JS into your build process:

```javascript
const { updateHTML } = require('@nithin93/sri-js');
const fs = require('fs');

// Read your HTML file
const html = fs.readFileSync('index.html', 'utf-8');

// Your SRI configuration
const config = {
  "script1.js": "sha384-hash1",
  "script2.js": "sha384-hash2"
};

// Update the HTML
const updatedHtml = updateHTML(html, config);

// Write the updated HTML back to the file
fs.writeFileSync('index.html', updatedHtml);
```

## API

### `enforceScriptIntegrity(config: SRIConfig): void`

Adds integrity attributes to dynamically loaded scripts based on configuration.

- **`config`**: A map of filenames to their SRI hashes.

### `updateHTML(html: string, config: SRIConfig): string`

Updates script tags in an HTML string with integrity attributes.

- **`html`**: The HTML string to update.
- **`config`**: A map of filenames to their SRI hashes.
- **Returns**: The updated HTML string.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
