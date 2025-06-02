const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');

// Create the dist directory if it doesn't exist
const distDir = path.join(__dirname, "../public");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function buildClient() {
  try {
    console.log('Bundling client script with esbuild...');
    
    await build({
      entryPoints: [path.join(__dirname, '../src/client.ts')],
      bundle: true,
      minify: true,
      format: 'iife',  // Immediately-invoked function expression for browser
      globalName: 'SRI',
      outfile: path.join(distDir, 'sri-client.js'),
      target: ['es2015'],
      define: { 'process.env.NODE_ENV': '"production"' },
      tsconfig: path.join(__dirname, '../tsconfig.client.json'),
      external: ['cheerio'],  // Exclude cheerio as it's not needed in the browser
      platform: 'browser',
      logLevel: 'info',
    });

    console.log('Client script built successfully!');
  } catch (error) {
    console.error('Error building client script:', error);
    process.exit(1);
  }
}

buildClient();
