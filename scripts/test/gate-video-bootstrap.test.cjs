'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'protection/protected-unlock.js'), 'utf8');
const marker = '// Public gate media bootstrap: isolated from the authentication closure.';
const offset = source.indexOf(marker);
assert(offset > 0 && source.indexOf(marker, offset + 1) === -1, 'one isolated bootstrap follows the auth closure');
const bootstrap = source.slice(offset);
const origin = 'https://fixture.test';
const workerUrl = origin + '/lunarvow-united/protected-worker.js';

// Model the browser's script load/error and controllerchange ordering. An old
// worker rejects the new path; the replacement uses the same script URL but
// has a distinct controller identity. No auth code or credentials are needed.
function gate({ controller = { scriptURL: workerUrl }, available = true, missingStage = false } = {}) {
  const attributes = new Map(), listeners = new Set(), requests = [], order = [];
  const stage = {
    hasAttribute: name => attributes.has(name),
    setAttribute(name, value) {
      assert.equal(name, 'data-video-bootstrap'); attributes.set(name, value);
    }
  };
  const fallback = { href: 'https://www.youtube.com/watch?v=OV5_LQArLa0', hidden: false };
  const serviceWorker = {
    controller,
    addEventListener(name, listener) {
      assert.equal(name, 'controllerchange'); order.push('listen'); listeners.add(listener);
    },
    removeEventListener(name, listener) {
      assert.equal(name, 'controllerchange'); listeners.delete(listener);
    }
  };
  const context = {
    URL,
    document: {
      currentScript: { src: origin + '/lunarvow-united/protected-unlock.js?v=password-5' },
      getElementById(id) {
        assert.equal(id, 'gate-video-stage', 'loader must not inspect form or fallback content');
        return missingStage ? null : stage;
      },
      createElement(tag) {
        assert.equal(tag, 'script');
        return { connected: false, remove() { this.connected = false; } };
      },
      head: {
        append(script) {
          if (available) assert.equal(listeners.size, 1, 'subscribe before the initial request');
          order.push('request'); script.connected = true;
          requests.push({ script, controller: serviceWorker.controller });
        }
      }
    },
    navigator: new Proxy({}, {
      get(_target, key) {
        assert.equal(key, 'serviceWorker', 'loader must not use credentials or other browser APIs');
        return available ? serviceWorker : undefined;
      }
    })
  };
  for (const name of ['location', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'postMessage']) {
    Object.defineProperty(context, name, { get() { throw new Error('Unexpected media-loader access: ' + name); } });
  }
  const run = () => vm.runInNewContext(bootstrap, context, { filename: 'gate-video-bootstrap.js' });
  run();
  return {
    requests, listeners, order, fallback, run,
    fail(index) { requests[index].script.onerror?.(); },
    succeed(index) { requests[index].script.onload?.(); },
    control(next) {
      serviceWorker.controller = next;
      for (const listener of [...listeners]) listener();
    }
  };
}

test('published unlock and bootstrap bytes match the source', () => {
  assert.equal(fs.readFileSync(path.join(root, 'docs/protected-unlock.js'), 'utf8'), source);
  assert(source.slice(0, offset).trimEnd().endsWith('})();'), 'bootstrap stays outside the authentication closure');
});

test('old-worker rejection recovers once a new controller claims the gate', () => {
  const oldWorker = { scriptURL: workerUrl }, newWorker = { scriptURL: workerUrl };
  const page = gate({ controller: oldWorker });
  assert.deepEqual(page.order, ['listen', 'request']);
  assert.equal(page.requests[0].script.src, origin + '/lunarvow-united/assets/gate-video.js?v=anfield-2');
  assert.equal(page.requests[0].script.async, true);
  page.fail(0);
  assert.equal(page.requests[0].script.connected, false);
  assert.equal(page.requests.length, 1, 'no retry against the same rejecting worker');
  page.control(newWorker);
  assert.equal(page.requests.length, 2);
  assert.equal(page.requests[1].controller, newWorker, 'compare identity, not the unchanged worker script URL');
  page.succeed(1);
  assert.equal(page.listeners.size, 0, 'successful load removes the update listener');
  page.control({ scriptURL: workerUrl });
  assert.equal(page.requests.length, 2, 'later updates never mount the media controller twice');
});

test('a controller update during a pending old-worker request is not missed', () => {
  const page = gate();
  const staleError = page.requests[0].script.onerror;
  const replacement = { scriptURL: workerUrl };
  page.control(replacement);
  assert.equal(page.requests.length, 1, 'only one request may be pending');
  staleError();
  assert.equal(page.requests.length, 2, 'the old failure immediately retries the replacement');
  assert.equal(page.requests[1].controller, replacement);
  staleError();
  assert.equal(page.requests.length, 2, 'a stale terminal callback cannot clear or duplicate the new request');
  page.succeed(1);
  assert.equal(page.listeners.size, 0);
});

test('pending success wins over controller changes and keeps one mounted runtime', () => {
  const page = gate();
  page.control({ scriptURL: workerUrl });
  page.succeed(0);
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].script.connected, true);
  assert.equal(page.listeners.size, 0);
  page.run();
  assert.equal(page.requests.length, 1, 'repeated bootstrap execution is also idempotent');
});

test('permanent media failure stays bounded and preserves the independent fallback', () => {
  const controller = { scriptURL: workerUrl }, page = gate({ controller });
  page.fail(0);
  for (let i = 0; i < 5; i++) page.control(controller);
  assert.equal(page.requests.length, 1);
  const replacement = { scriptURL: workerUrl };
  page.control(replacement); page.fail(1);
  page.control(replacement); page.control(controller);
  assert.equal(page.requests.length, 2, 'one attempt for each distinct controller, including revisits');
  assert.deepEqual(page.fallback, { href: 'https://www.youtube.com/watch?v=OV5_LQArLa0', hidden: false });
});

test('uncontrolled first loads retry after claim, while browsers without service workers make one normal attempt', () => {
  const page = gate({ controller: null });
  page.fail(0);
  page.control({ scriptURL: workerUrl });
  assert.equal(page.requests.length, 2);
  page.succeed(1);
  assert.equal(page.listeners.size, 0);
  const unsupported = gate({ available: false });
  assert.equal(unsupported.requests.length, 1);
  unsupported.fail(0);
  assert.equal(unsupported.requests.length, 1);
  assert.equal(unsupported.listeners.size, 0);
});

test('pages without the video stage do not install a loader or worker listener', () => {
  const page = gate({ missingStage: true });
  assert.equal(page.requests.length, 0);
  assert.equal(page.listeners.size, 0);
});
