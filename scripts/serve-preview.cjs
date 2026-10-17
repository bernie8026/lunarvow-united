/* A dependency-free local preview, bound only to this computer. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
const port = Number(process.env.PORT || 8766);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer((request, response) => {
  if (!['GET','HEAD'].includes(request.method)) {response.writeHead(405).end();return;}
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    filename = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!filename.startsWith(root + path.sep)) {response.writeHead(403).end();return;}
  } catch {response.writeHead(400).end();return;}
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) {response.writeHead(404).end();return;}
    response.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});
    if (request.method === 'HEAD') {response.end();return;}
    const stream = fs.createReadStream(filename);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  });
}).listen(port, '127.0.0.1', () => console.log(`Portfolio preview: http://127.0.0.1:${port}/`));
