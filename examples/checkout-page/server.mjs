import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function createCheckoutServer() {
  const reports = [];
  const server = createServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/integrity-report') {
      let body = '';
      for await (const chunk of request) body += chunk;
      reports.push(JSON.parse(body));
      response.writeHead(204).end();
      return;
    }
    const paths = { '/': ['index.html', 'text/html'], '/dayjs-1.11.13.js': ['dayjs-1.11.13.js', 'text/javascript'] };
    const file = paths[request.url];
    if (!file) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', file[1]);
    response.end(await readFile(new URL(`./public/${file[0]}`, import.meta.url)));
  });
  return { server, reports };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createCheckoutServer().server.listen(8080, '127.0.0.1', () => console.log('Open http://127.0.0.1:8080'));
}
