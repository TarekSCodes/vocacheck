'use strict';

const http = require('http');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');

let tmpdir;
let app;
let upstreamServer;
let upstreamPort;

/**
 * Starts a minimal upstream HTTP server that echoes back the request path
 * and a fixed JSON body. Used to test the proxy middleware without needing
 * real Ollama or Whisper containers.
 */
function startUpstream(responseBody = '{"ok":true}', statusCode = 200) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(responseBody);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-int-proxy-'));
  upstreamServer = await startUpstream('{"models":[]}');
  upstreamPort = upstreamServer.address().port;

  process.env.DATA_PATH = tmpdir;
  process.env.OLLAMA_URL = `http://127.0.0.1:${upstreamPort}`;
  process.env.WHISPER_URL = `http://127.0.0.1:${upstreamPort}`;

  jest.resetModules();
  app = require('../../server');
});

afterEach(async () => {
  delete process.env.DATA_PATH;
  delete process.env.OLLAMA_URL;
  delete process.env.WHISPER_URL;
  await fs.rm(tmpdir, { recursive: true, force: true });
  await new Promise((resolve) => upstreamServer.close(resolve));
});

describe('Proxy — /api/ollama/*', () => {
  test('forwards GET request to upstream and returns its response', async () => {
    const res = await request(app).get('/api/ollama/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ models: [] });
  });

  test('forwards POST request to upstream', async () => {
    const res = await request(app)
      .post('/api/ollama/api/generate')
      .send({ model: 'llama3.1:8b', prompt: 'Hello' });
    expect(res.status).toBe(200);
  });
});

describe('Proxy — /api/whisper/*', () => {
  test('forwards GET request to upstream Whisper service', async () => {
    const res = await request(app).get('/api/whisper/asr');
    expect(res.status).toBe(200);
  });
});

describe('Proxy — upstream error handling', () => {
  test('returns 502 when upstream is unreachable', async () => {
    // Close upstream before the request
    await new Promise((resolve) => upstreamServer.close(resolve));
    const res = await request(app).get('/api/ollama/api/tags');
    expect(res.status).toBe(502);
    // Restart a dummy server so afterEach close() doesn't fail
    upstreamServer = http.createServer((_, r) => r.end()).listen(upstreamPort);
  });
});
