/* Exercise protected media offline with synthetic archive bytes; no password is needed. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scope = 'https://example.test/lunarvow-united/';
const workerPath = path.resolve(__dirname, '../protection/protected-worker.js');
const listeners = new Map();
const networkCalls = [];
const broadcasts = [];
const navigations = [];
const client = {
  id: 'offline-test-client',
  url: new URL('index.html', scope).href,
  postMessage(message) { broadcasts.push(message.type); },
  async navigate(url) { navigations.push(url); }
};
const context = vm.createContext({
  URL, Request, Response, Headers, ArrayBuffer, TextDecoder, setTimeout,
  fetch: async (...args) => {
    networkCalls.push(args);
    throw new Error('This regression test must remain offline');
  },
  self: {
    registration: {scope},
    clients: {
      async get(id) { return id === client.id ? client : undefined; },
      async matchAll() { return [client]; },
      async claim() {}
    },
    async skipWaiting() {},
    addEventListener(type, listener) {
      assert(!listeners.has(type), `Only one ${type} listener is expected`);
      listeners.set(type, listener);
    }
  }
});
vm.runInContext(fs.readFileSync(workerPath, 'utf8'), context, {filename: workerPath});

// Keep fixture bytes outside ASCII so an error body cannot accidentally pass a
// plaintext-leak check merely by containing common letters from the source.
const media = [
  {path: 'assets/example-audio.mp3', type: 'audio/mpeg', bytes: Buffer.from(Array.from({length: 32}, (_, i) => 0x80 + i))},
  {path: 'assets/example-video.mp4', type: 'video/mp4', bytes: Buffer.from(Array.from({length: 48}, (_, i) => 0xb0 + i))}
];
const emptyMedia = [
  {path: 'assets/empty-audio.mp3', type: 'audio/mpeg', bytes: Buffer.alloc(0)},
  {path: 'assets/empty-video.mp4', type: 'video/mp4', bytes: Buffer.alloc(0)}
];
const textFile = {path: 'assets/example.txt', type: 'text/plain; charset=utf-8', bytes: Buffer.from('Private non-media fixture.\n')};
const indexFile = {path: 'index.html', type: 'text/html; charset=utf-8', bytes: Buffer.from('<!doctype html><head></head><main>Offline fixture</main>')};
const archiveEntry = file => ({
  path: file.path,
  type: file.type,
  data: Uint8Array.from(file.bytes).buffer
});

async function message(data) {
  const replies = [];
  const pending = [];
  let closed = 0;
  listeners.get('message')({
    source: {id: client.id},
    origin: new URL(scope).origin,
    data,
    ports: [{
      postMessage(reply) { replies.push(JSON.parse(JSON.stringify(reply))); },
      close() { closed++; }
    }],
    waitUntil(promise) { pending.push(Promise.resolve(promise)); }
  });
  assert.equal(pending.length, 1, 'message lifecycle must be extended');
  await Promise.all(pending);
  assert.equal(replies.length, 1, 'message must receive one acknowledgement');
  assert.equal(closed, 1, 'message port must close');
  assert.equal(replies[0].ok, true, 'trusted client message must succeed');
  return replies[0];
}

async function request(filePath, {method = 'GET', range, ifRange} = {}) {
  const headers = {};
  if (range !== undefined) headers.Range = range;
  if (ifRange !== undefined) headers['If-Range'] = ifRange;
  let pending;
  listeners.get('fetch')({
    request: new Request(new URL(filePath, scope), {method, headers}),
    respondWith(response) {
      assert.equal(pending, undefined, 'fetch must have one response');
      pending = Promise.resolve(response);
    }
  });
  assert(pending, 'worker must handle a request inside its scope');
  const response = await pending;
  return {response, body: Buffer.from(await response.arrayBuffer())};
}

function noStore(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store', 'decrypted and error responses must not be cached');
}

function mediaHeaders(response, file, length) {
  assert.equal(response.headers.get('content-type'), file.type, 'media MIME type must be preserved');
  assert.equal(response.headers.get('accept-ranges'), 'bytes', 'media must advertise byte ranges');
  assert.equal(response.headers.get('content-length'), String(length), 'media must declare the exact response length');
  noStore(response);
}

function noMediaBytes(body, file) {
  assert(!body.some(byte => file.bytes.includes(byte)), 'an error must not expose any synthetic media bytes');
}

let passed = 0;
async function test(label, operation) {
  await operation();
  passed++;
  console.log(`PASS ${label}`);
}

async function main() {
  await test('A multi-megabyte media archive encrypts and restores without regex stack overflow', async () => {
    const crypto = require('node:crypto');
    const {encryptArchive, decryptArchive} = require('./prepare-protected-site.cjs');
    const payload = crypto.randomBytes(5 * 1024 * 1024), password = crypto.randomBytes(32);
    const archive = {version:1,files:[{path:'assets/large.webm',type:'video/webm',data:payload.toString('base64')}]};
    try {
      const restored = decryptArchive(encryptArchive(archive,password),password);
      assert.deepEqual(Buffer.from(restored.files[0].data,'base64'),payload);
      for (const data of ['a','abc','ab=c','a===','!!!!']) {
        assert.throws(() => decryptArchive(encryptArchive({version:1,files:[{path:'bad.webm',type:'video/webm',data}]},password),password), /Invalid archive data/);
      }
    } finally { password.fill(0);payload.fill(0); }
  });
  assert.equal(typeof listeners.get('message'), 'function');
  assert.equal(typeof listeners.get('fetch'), 'function');

  await test('Locked media rejects range requests without plaintext', async () => {
    assert.equal((await message({type: 'STATE'})).unlocked, false);
    for (const file of media) {
      const {response, body} = await request(file.path, {range: 'bytes=0-7'});
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('x-portfolio-locked'), '1');
      noStore(response);
      noMediaBytes(body, file);
    }
  });

  await message({type: 'UNLOCK', files: [indexFile, textFile, ...media, ...emptyMedia].map(archiveEntry)});
  assert.equal((await message({type: 'STATE'})).unlocked, true);

  for (const file of media) {
    const kind = file.type.split('/')[0];
    await test(`${kind}: full GET and HEAD preserve MIME, size and no-store`, async () => {
      const get = await request(file.path);
      assert.equal(get.response.status, 200);
      mediaHeaders(get.response, file, file.bytes.length);
      assert.equal(get.response.headers.get('content-range'), null);
      assert.deepEqual(get.body, file.bytes);

      const head = await request(file.path, {method: 'HEAD'});
      assert.equal(head.response.status, 200);
      mediaHeaders(head.response, file, file.bytes.length);
      assert.equal(head.response.headers.get('content-range'), null);
      assert.equal(head.body.length, 0);
    });

    await test(`${kind}: closed, open, suffix and clamped ranges return exact bytes`, async () => {
      const size = file.bytes.length;
      const ranges = [
        ['bytes=3-8', 3, 8],
        ['bytes=12-', 12, size - 1],
        ['bytes=-5', size - 5, size - 1],
        [`bytes=${size - 4}-999`, size - 4, size - 1],
        ['bytes=0-0', 0, 0],
        ['bytes=-999', 0, size - 1],
        [`bytes=0-${size - 1}`, 0, size - 1]
      ];
      for (const [range, start, end] of ranges) {
        const {response, body} = await request(file.path, {range});
        assert.equal(response.status, 206, range);
        mediaHeaders(response, file, end - start + 1);
        assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${size}`, range);
        assert.deepEqual(body, file.bytes.subarray(start, end + 1), range);
      }
    });

    await test(`${kind}: invalid or unsupported ranges return 416 without plaintext`, async () => {
      const size = file.bytes.length;
      const ranges = [
        'bytes=-0',
        'bytes=8-3',
        `bytes=${size}-`,
        `bytes=${size}-${size + 4}`,
        'bytes=100-200',
        'bytes=',
        'bytes=abc',
        'bytes=a-b',
        'bytes=1-2garbage',
        'items=1-2',
        'bytes=1-2,4-5',
        'bytes=1-2,',
        'bytes=9007199254740992-',
        'bytes=0-9007199254740992',
        'bytes=-9007199254740992',
        'bytes=+1-2',
        'bytes=1--2',
        'bytes=1.0-2',
        'bytes=--1'
      ];
      for (const range of ranges) {
        const {response, body} = await request(file.path, {range});
        assert.equal(response.status, 416, range);
        assert.equal(response.headers.get('content-range'), `bytes */${size}`, range);
        mediaHeaders(response, file, 0);
        assert.equal(body.length, 0, range);
        noMediaBytes(body, file);
      }
    });

    await test(`${kind}: HEAD ignores valid and invalid Range headers`, async () => {
      for (const range of ['bytes=3-8', 'bytes=-0', 'bytes=1-2,4-5']) {
        const {response, body} = await request(file.path, {method: 'HEAD', range});
        assert.equal(response.status, 200, range);
        mediaHeaders(response, file, file.bytes.length);
        assert.equal(response.headers.get('content-range'), null, range);
        assert.equal(body.length, 0, range);
      }
    });

    await test(`${kind}: If-Range returns the complete current representation`, async () => {
      for (const ifRange of ['"stale-fixture-etag"', 'Wed, 21 Oct 2015 07:28:00 GMT', '']) {
        for (const range of ['bytes=3-8', 'bytes=-0']) {
          const {response, body} = await request(file.path, {range, ifRange});
          assert.equal(response.status, 200, `${range}, If-Range: ${ifRange}`);
          mediaHeaders(response, file, file.bytes.length);
          assert.equal(response.headers.get('content-range'), null);
          assert.deepEqual(body, file.bytes);
        }
      }
    });
  }

  await test('Empty audio and video have zero length and reject every byte range', async () => {
    for (const file of emptyMedia) {
      for (const method of ['GET', 'HEAD']) {
        const {response, body} = await request(file.path, {method});
        assert.equal(response.status, 200);
        mediaHeaders(response, file, 0);
        assert.equal(response.headers.get('content-range'), null);
        assert.equal(body.length, 0);
      }
      for (const range of ['bytes=0-0', 'bytes=0-', 'bytes=-1']) {
        const {response, body} = await request(file.path, {range});
        assert.equal(response.status, 416, range);
        mediaHeaders(response, file, 0);
        assert.equal(response.headers.get('content-range'), 'bytes */0');
        assert.equal(body.length, 0);

        const head = await request(file.path, {method: 'HEAD', range});
        assert.equal(head.response.status, 200, range);
        mediaHeaders(head.response, file, 0);
        assert.equal(head.response.headers.get('content-range'), null);
        assert.equal(head.body.length, 0);
      }
    }
  });

  await test('Non-media ignores Range and keeps its full original response', async () => {
    for (const range of ['bytes=3-8', 'bytes=-0', 'bytes=1-2,4-5']) {
      const {response, body} = await request(textFile.path, {range});
      assert.equal(response.status, 200, range);
      assert.equal(response.headers.get('content-type'), textFile.type);
      assert.equal(response.headers.get('content-range'), null);
      noStore(response);
      assert.deepEqual(body, textFile.bytes, range);
    }
  });

  await test('Unknown media remains 404 for ordinary and range requests', async () => {
    for (const range of [undefined, 'bytes=0-7']) {
      const {response, body} = await request('assets/missing.mp4', {range});
      assert.equal(response.status, 404);
      noStore(response);
      for (const file of media) noMediaBytes(body, file);
    }
  });

  await test('Re-lock clears media and the next unlock cannot recover the old archive', async () => {
    await message({type: 'LOCK'});
    assert.equal((await message({type: 'STATE'})).unlocked, false);
    assert.deepEqual(broadcasts, ['LOCKED']);
    assert.deepEqual(navigations, [client.url]);
    for (const file of media) {
      const {response, body} = await request(file.path, {range: 'bytes=0-7'});
      assert.equal(response.status, 401);
      noStore(response);
      noMediaBytes(body, file);
    }
    await message({type: 'UNLOCK', files: [indexFile].map(archiveEntry)});
    for (const file of media) {
      const {response, body} = await request(file.path, {range: 'bytes=0-7'});
      assert.equal(response.status, 404);
      noStore(response);
      noMediaBytes(body, file);
    }
    await message({type: 'LOCK'});
    assert.equal((await message({type: 'STATE'})).unlocked, false);
  });

  assert.equal(networkCalls.length, 0, 'the entire regression must run without a network request');
  console.log(JSON.stringify({passed, networkRequests: networkCalls.length, worker: path.relative(path.resolve(__dirname, '..'), workerPath)}));
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
