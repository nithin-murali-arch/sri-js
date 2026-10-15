import Fastify from 'fastify';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { generateSRI, updateHTML } = require('@nithin93/sri-js');
const publicDir = join(import.meta.dirname, 'public');
const sri = await generateSRI({ algorithm: 'sha384', basePath: publicDir }).generateForDirectory();
const app = Fastify();
app.addHook('onSend', async (request, reply, payload) => {
  const contentType = String(reply.getHeader('content-type') ?? '');
  if (!contentType.includes('text/html') || typeof payload !== 'string') return payload;
  return updateHTML(payload, sri);
});
app.get('/', async (request, reply) => {
  reply.type('text/html');
  return '<!doctype html><html><body><script src="/app.js"></script></body></html>';
});
app.get('/app.js', async (request, reply) => {
  reply.type('application/javascript');
  return readFile(join(publicDir, 'app.js'), 'utf8');
});
await app.listen({ host: '127.0.0.1', port: 4311 });
console.log('Fastify listening on 127.0.0.1:4311');
