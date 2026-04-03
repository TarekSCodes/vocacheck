'use strict';

const http = require('http');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');

let tmpdir;
let app;
let fakeOllama;
let fakeOllamaPort;

/**
 * Starts a minimal HTTP server that responds with the given JSON body.
 * Used as a stand-in for the Ollama container.
 *
 * @param {Function} handler - (req, res) => void
 */
function startFakeOllama(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function setupApp(ollamaHandler) {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-int-admin-'));
  fakeOllama = await startFakeOllama(ollamaHandler);
  fakeOllamaPort = fakeOllama.address().port;

  process.env.DATA_PATH = tmpdir;
  process.env.OLLAMA_URL = `http://127.0.0.1:${fakeOllamaPort}`;
  jest.resetModules();
  app = require('../../server');
}

afterEach(async () => {
  delete process.env.DATA_PATH;
  delete process.env.OLLAMA_URL;
  if (tmpdir) await fs.rm(tmpdir, { recursive: true, force: true });
  if (fakeOllama) await new Promise((resolve) => fakeOllama.close(resolve));
});

// ---------------------------------------------------------------------------
// GET /api/admin/status — Ollama reachable with models
// ---------------------------------------------------------------------------

describe('GET /api/admin/status — Ollama reachable', () => {
  beforeEach(async () => {
    await setupApp((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [{ name: 'llama3.1:8b' }] }));
    });
  });

  test('returns ollamaReachable:true when Ollama responds', async () => {
    const res = await request(app).get('/api/admin/status');
    expect(res.status).toBe(200);
    expect(res.body.ollamaReachable).toBe(true);
  });

  test('returns modelInstalled:true when at least one model is present', async () => {
    const res = await request(app).get('/api/admin/status');
    expect(res.body.modelInstalled).toBe(true);
    expect(res.body.models).toContain('llama3.1:8b');
  });
});

describe('GET /api/admin/status — Ollama reachable but no models', () => {
  beforeEach(async () => {
    await setupApp((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [] }));
    });
  });

  test('returns modelInstalled:false when model list is empty', async () => {
    const res = await request(app).get('/api/admin/status');
    expect(res.body.ollamaReachable).toBe(true);
    expect(res.body.modelInstalled).toBe(false);
  });
});

describe('GET /api/admin/status — Ollama unreachable', () => {
  beforeEach(async () => {
    // Do NOT start a fake Ollama — use an invalid port so connection fails
    tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-int-admin-'));
    process.env.DATA_PATH = tmpdir;
    process.env.OLLAMA_URL = 'http://127.0.0.1:1'; // port 1 is always refused
    jest.resetModules();
    app = require('../../server');
    fakeOllama = null;
  });

  test('returns ollamaReachable:false when Ollama is not running', async () => {
    const res = await request(app).get('/api/admin/status');
    expect(res.status).toBe(200);
    expect(res.body.ollamaReachable).toBe(false);
    expect(res.body.modelInstalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/gpu-status
// ---------------------------------------------------------------------------

describe('GET /api/admin/gpu-status', () => {
  beforeEach(async () => {
    await setupApp((req, res) => { res.writeHead(200); res.end('{}'); });
  });

  test('returns a JSON response (200 or 500 depending on Docker availability)', async () => {
    const res = await request(app).get('/api/admin/gpu-status');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('gpuAvailable');
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/pull-model
// ---------------------------------------------------------------------------

describe('POST /api/admin/pull-model — validation', () => {
  beforeEach(async () => {
    await setupApp((req, res) => { res.writeHead(200); res.end('{}'); });
  });

  test('returns 400 if model field is missing', async () => {
    const res = await request(app).post('/api/admin/pull-model').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/admin/pull-model — SSE streaming', () => {
  beforeEach(async () => {
    await setupApp((req, res) => {
      // Fake Ollama streaming response for /api/pull
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      res.write(JSON.stringify({ status: 'pulling manifest' }) + '\n');
      res.write(JSON.stringify({ status: 'success' }) + '\n');
      res.end();
    });
  });

  test('streams SSE events and ends with complete event', (done) => {
    const chunks = [];
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: fakeOllamaPort, // will be replaced by app's port below
        path: '/api/admin/pull-model',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    // Use supertest to get the app's port via a listening server
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const sseReq = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/admin/pull-model',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength('{"model":"llama3.1:8b"}') },
        },
        (res) => {
          expect(res.headers['content-type']).toMatch('text/event-stream');
          res.on('data', (chunk) => chunks.push(chunk.toString()));
          res.on('end', () => {
            const full = chunks.join('');
            expect(full).toContain('data:');
            expect(full).toContain('"status":"complete"');
            server.close(done);
          });
        }
      );
      sseReq.write('{"model":"llama3.1:8b"}');
      sseReq.end();
    });
    req.destroy(); // unused
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/restart-whisper
// ---------------------------------------------------------------------------

describe('POST /api/admin/restart-whisper', () => {
  beforeEach(async () => {
    await setupApp((req, res) => { res.writeHead(200); res.end('{}'); });
  });

  test('returns 200 or 500 depending on Docker availability', async () => {
    const res = await request(app).post('/api/admin/restart-whisper');
    expect([200, 500]).toContain(res.status);
  });
});
