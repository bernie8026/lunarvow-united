/* Preview only the encrypted publication, bound to this computer. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../docs');
const port = Number(process.env.PORT || 8766);
const base = process.env.PORTFOLIO_BASE_PATH || '/lunarvow-united/';
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('Invalid preview base path');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer((request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === base.slice(0, -1)) { response.writeHead(302, {Location:base}).end(); return; }
    if (!pathname.startsWith(base)) { response.writeHead(404).end(); return; }
    const relative = pathname.slice(base.length) || 'index.html';
    if (relative.includes('\\') || relative.split('/').some(part => part === '.' || part === '..')) { response.writeHead(403).end(); return; }
    filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  } catch { response.writeHead(400).end(); return; }
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = fs.createReadStream(filename);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  });
}).listen(port, '127.0.0.1', () => console.log(`Protected preview: http://127.0.0.1:${port}${base}`));
