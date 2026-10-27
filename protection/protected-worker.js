"use strict";

// The decrypted site lives only in this worker's memory. A stopped worker starts
// locked again; neither a key nor a decrypted response enters persistent storage.
const base = new URL(self.registration.scope);
const bootstrap = new Set([
  "protected-worker.js", "protected-unlock.js", "protected-session.js",
  "protected-site.json", ".nojekyll", "robots.txt"
]);
const shells = new Set([
  "index.html", "about.html", "experience.html", "education.html",
  "skills.html", "projects.html", "photography.html", "equipment.html", "stem.html", "contact.html", "sitemap.html", "404.html"
]);
let files = null;

function validPath(path) {
  return typeof path === "string" && path.length > 0 && path.length < 2048 &&
    !/[\\%?#:\u0000-\u001f\u007f]/.test(path) &&
    path.split("/").every(part => part && part !== "." && part !== "..");
}

function pathFor(url) {
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  let path;
  try { path = decodeURIComponent(url.pathname.slice(base.pathname.length)); } catch { return null; }
  return path === "" ? "index.html" : validPath(path) ? path : null;
}

async function trustedSource(event) {
  if (!event.source?.id || (event.origin && event.origin !== base.origin)) return false;
  const client = await self.clients.get(event.source.id);
  if (!client) return false;
  try {
    const url = new URL(client.url);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname);
  } catch { return false; }
}

function receiveFiles(entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 10000) throw new Error("Invalid archive");
  const next = new Map();
  for (const entry of entries) {
    if (!entry || !validPath(entry.path) || next.has(entry.path) || !(entry.data instanceof ArrayBuffer)) throw new Error("Invalid archive entry");
    if (typeof entry.type !== "string" || !entry.type || entry.type.length > 160 || /[\r\n\u0000]/.test(entry.type)) throw new Error("Invalid content type");
    next.set(entry.path, {type:entry.type, data:entry.data});
  }
  if (!next.has("index.html")) throw new Error("Missing index");
  return next;
}

async function closeClients() {
  // Let the requesting page receive its acknowledgement before navigation can
  // destroy its MessagePort. Other tabs clear their old DOM on this broadcast.
  await new Promise(resolve => setTimeout(resolve, 75));
  const clients = await self.clients.matchAll({type:"window", includeUncontrolled:true});
  await Promise.all(clients.map(async client => {
    let url;
    try { url = new URL(client.url); } catch { return; }
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
    client.postMessage({type:"LOCKED"});
    try { await client.navigate(client.url); } catch {}
  }));
}

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("message", event => {
  const port = event.ports?.[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      if (!await trustedSource(event)) { port.postMessage({ok:false, error:"Untrusted client"}); return; }
      const message = event.data;
      if (message?.type === "STATE") port.postMessage({ok:true, unlocked:files !== null});
      else if (message?.type === "UNLOCK") {
        const next = receiveFiles(message.files);
        files = next;
        port.postMessage({ok:true});
      } else if (message?.type === "LOCK") {
        files = null;
        port.postMessage({ok:true});
        await closeClients();
      } else port.postMessage({ok:false, error:"Unknown message"});
    } catch {
      port.postMessage({ok:false, error:"The site archive could not be loaded"});
    } finally { port.close(); }
  })());
});

function response(body, status, type, head, extra = {}) {
  return new Response(head ? null : body, {status, headers:{
    "Content-Type":type, "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", ...extra
  }});
}

function mediaResponse(request, file, head) {
  const size = file.data.byteLength;
  const headers = {"Accept-Ranges":"bytes", "Content-Length":String(size)};
  // Range applies only to GET. There are no validators for the private in-memory
  // archive, so an If-Range request receives the complete current representation.
  const range = head || request.headers.has("If-Range") ? null : request.headers.get("Range");
  if (range === null) return response(file.data, 200, file.type, head, headers);
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  const invalid = () => response(null, 416, file.type, head, {
    ...headers, "Content-Length":"0", "Content-Range":`bytes */${size}`
  });
  // Serve one byte range only; malformed, multipart and impossible ranges never
  // return decrypted data or allocate a buffer based on an untrusted length.
  if (!match || (!match[1] && !match[2]) || !size) return invalid();
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return invalid();
    end = Math.min(end, size - 1);
  }
  return response(file.data.slice(start, end + 1), 206, file.type, head, {
    ...headers, "Content-Length":String(end - start + 1), "Content-Range":`bytes ${start}-${end}/${size}`
  });
}

async function gate(request, head) {
  try {
    const source = await fetch(new URL("index.html", base), {cache:"no-store", credentials:"same-origin"});
    if (!source.ok) throw new Error("Gate unavailable");
    const body = head ? null : await source.arrayBuffer();
    return response(body, 200, "text/html; charset=utf-8", head, {"X-Portfolio-Locked":"1"});
  } catch {
    return response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Portfolio locked</title><body style='background:#070d18;color:#d9f5ff;font:16px/1.6 system-ui;padding:8vw'><h1>網站已鎖定 / Portfolio locked</h1><p>請連線後重新整理。Reconnect and reload to unlock.</p>", 503, "text/html; charset=utf-8", head, {"X-Portfolio-Locked":"1"});
  }
}

async function handle(request, path) {
  const head = request.method === "HEAD";
  // Public bootstrap code and ciphertext can never be shadowed by archive data.
  if (bootstrap.has(path)) return fetch(request, {cache:"no-store"});
  if (files !== null) {
    const file = files.get(path);
    if (!file) return response("Not found", 404, "text/plain; charset=utf-8", head);
    if (/^(?:audio|video)\//i.test(file.type)) return mediaResponse(request, file, head);
    let body = file.data;
    if (/\.html$/i.test(path) || /^text\/html(?:;|$)/i.test(file.type)) {
      const source = new TextDecoder("utf-8", {fatal:true}).decode(body);
      const script = `<script src="${new URL("protected-session.js", base).pathname}" defer></script>`;
      body = /<\/head\s*>/i.test(source) ? source.replace(/<\/head\s*>/i, script + "</head>") : script + source;
    }
    return response(body, 200, file.type, head);
  }
  if (request.mode === "navigate") return gate(request, head);
  if (shells.has(path)) {
    const source = await fetch(request, {cache:"no-store"});
    const headers = new Headers(source.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Portfolio-Locked", "1");
    return new Response(head ? null : source.body, {status:source.status, statusText:source.statusText, headers});
  }
  return response("Portfolio locked", 401, "text/plain; charset=utf-8", head, {"X-Portfolio-Locked":"1"});
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  const path = pathFor(url);
  event.respondWith(path === null ? Promise.resolve(response("Not found", 404, "text/plain; charset=utf-8", request.method === "HEAD")) : handle(request, path));
});
