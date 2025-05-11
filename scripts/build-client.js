const fs = require('fs');
const path = require('path');

// Read the client source
const clientSource = fs.readFileSync(
  path.join(__dirname, '../src/client.ts'),
  'utf-8'
);

// Create the dist directory if it doesn't exist
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the client script
fs.writeFileSync(
  path.join(distDir, 'sri-client.js'),
  clientSource,
  'utf-8'
);

console.log('Client script built successfully!'); 