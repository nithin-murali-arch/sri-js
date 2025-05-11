[![npm version](https://img.shields.io/npm/v/@nithin93/sri-js.svg)](https://www.npmjs.com/package/@nithin93/sri-js)
[![Build Status](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nithin-murali-arch/sri-js/actions/workflows/ci.yml)

# SRI-JS

A modern TypeScript library for generating and enforcing Subresource Integrity (SRI) hashes for web resources. SRI-JS is designed to help you secure your client-side assets and meet compliance requirements such as PCI DSS.

## Why SRI-JS?

- **PCI DSS Compliance**: Helps meet requirement 6.5.8 (addressing all known vulnerabilities) by ensuring the integrity of client-side resources
- **Security First**: Prevents unauthorized modifications to your JavaScript and CSS files
- **Zero Configuration**: Works out of the box with minimal setup
- **TypeScript Support**: Full type safety and a modern development experience

## Features

- Generate SRI hashes for JavaScript and CSS files
- Client-side enforcement of SRI using MutationObserver
- Support for dynamically added script tags
- TypeScript support
- Multiple hash algorithms (`sha256`, `sha384`, `sha512`)
- Automatic handling of relative and absolute paths

## Installation

```bash
npm install sri-js
```

## Usage

### Server-side (Node.js)

```typescript
import { generateSRI } from 'sri-js';

// Generate SRI hashes for all JS files in a directory
const generator = generateSRI({
  algorithm: 'sha384', // Optional, defaults to 'sha384'
  basePath: './dist'   // Optional, defaults to process.cwd()
});

// Generate hashes for a specific directory
const sriMap = await generator.generateForDirectory('./dist', ['.js', '.css']);

// The sriMap will look like this:
// {
//   'script1.js': 'sha384-abc123...',
//   'script2.js': 'sha384-def456...',
//   'styles.css': 'sha384-ghi789...'
// }
```

### Client-side (Browser)

1. Include the client script in your HTML:

```html
<script src="path/to/sri-js-client.js"></script>
```

2. Initialize the SRI map in your HTML before any other scripts:

```html
<script>
window.SRI = {
  config: {
    // This should match the sriMap generated while building
    'script1.js': 'sha384-abc123...',
    'script2.js': 'sha384-def456...',
    'styles.css': 'sha384-ghi789...'
  }
};
</script>
```

The client script will automatically:
- Add integrity attributes to all existing script tags
- Monitor for dynamically added script tags and add integrity attributes
- Use only the filename (not the full path) to match against the SRI map

### Integration with Build Tools

#### Webpack

```javascript
const { generateSRI } = require('sri-js');

class SriPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('SriPlugin', async (compilation, callback) => {
      const generator = generateSRI({
        basePath: compiler.outputPath
      });
      
      const sriMap = await generator.generateForDirectory(compiler.outputPath, ['.js', '.css']);
      // Write sriMap to a file or inject it into your HTML
      callback();
    });
  }
}
```

#### Rollup

```javascript
import { generateSRI } from 'sri-js';

export default {
  // ... other config
  plugins: [
    {
      name: 'sri',
      async writeBundle(options, bundle) {
        const generator = generateSRI({
          basePath: options.dir
        });
        
        const sriMap = await generator.generateForDirectory(options.dir, ['.js', '.css']);
        // Use sriMap as needed
      }
    }
  ]
};
```

## API

### Server-side

#### `generateSRI(options: SRIOptions): SRIGenerator`

Creates a new SRI generator instance.

Options:
- `algorithm`: Hash algorithm to use (default: 'sha384')
- `basePath`: Base path for file resolution (default: process.cwd())

#### `SRIGenerator.generateForDirectory(dirPath: string, extensions: string[]): Promise<SRIMap>`

Generates SRI hashes for all files with specified extensions in a directory.

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
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT
