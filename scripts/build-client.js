const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create the dist directory if it doesn't exist
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Compile the client script
console.log('Compiling client script...');
execSync('npx tsc -p tsconfig.client.json', {
  stdio: 'inherit'
});

// Read the compiled client script
const clientSource = fs.readFileSync(
  path.join(distDir, 'client.js'),
  'utf-8'
);

// Wrap the code in an IIFE to avoid global scope pollution
const wrappedCode = `(function() {
${clientSource}
})();`;

// Write the client script
fs.writeFileSync(
  path.join(distDir, 'sri-client.js'),
  wrappedCode,
  'utf-8'
);

// Clean up the intermediate file
fs.unlinkSync(path.join(distDir, 'client.js'));

console.log('Client script built successfully!'); 