/**
 * @file AdminService.test.js
 * Tests for the frontend AdminService — fetch wrappers and SSE streaming.
 */

import { getStatus, getGpuStatus, restartWhisper, pullModel } from '../services/AdminService.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal mock body with a getReader() that emits the given SSE lines.
 * Avoids ReadableStream (not available in jsdom) by directly mocking the reader API
 * that AdminService.pullModel uses.
 */
function makeSseBody(lines) {
  const chunks = lines.map((line) => Buffer.from(`data: ${line}\n\n`));
  let index = 0;
  return {
    getReader: () => ({
      read: async () => {
        if (index >= chunks.length) return { value: undefined, done: true };
        return { value: chunks[index++], done: false };
      },
    }),
  };
}

// ── getStatus ─────────────────────────────────────────────────────────────────

describe('getStatus', () => {
  test('returns parsed JSON on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ollamaReachable: true, modelInstalled: true, models: ['llama3.1:8b'] }),
    });
    const result = await getStatus();
    expect(result.ollamaReachable).toBe(true);
    expect(result.modelInstalled).toBe(true);
  });

  test('throws HTTP error unchanged on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(getStatus()).rejects.toThrow('HTTP 503');
  });

  test('wraps network TypeError in VocaCheckError', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getStatus()).rejects.toThrow('Backend nicht erreichbar');
  });
});

// ── getGpuStatus ──────────────────────────────────────────────────────────────

describe('getGpuStatus', () => {
  test('returns parsed JSON on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ gpuAvailable: false }),
    });
    const result = await getGpuStatus();
    expect(result.gpuAvailable).toBe(false);
  });

  test('wraps network TypeError in VocaCheckError', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getGpuStatus()).rejects.toThrow('Backend nicht erreichbar');
  });
});

// ── restartWhisper ────────────────────────────────────────────────────────────

describe('restartWhisper', () => {
  test('returns parsed JSON on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const result = await restartWhisper();
    expect(result.success).toBe(true);
  });

  test('wraps network TypeError in VocaCheckError', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(restartWhisper()).rejects.toThrow('Backend nicht erreichbar');
  });
});

// ── pullModel ─────────────────────────────────────────────────────────────────

describe('pullModel — success', () => {
  test('calls onProgress for each SSE event and resolves', async () => {
    const events = [
      JSON.stringify({ status: 'pulling manifest' }),
      JSON.stringify({ status: 'success' }),
      JSON.stringify({ status: 'complete' }),
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(events),
    });

    const received = [];
    await pullModel('llama3.1:8b', (e) => received.push(e));
    expect(received).toHaveLength(3);
    expect(received[0].status).toBe('pulling manifest');
    expect(received[2].status).toBe('complete');
  });
});

describe('pullModel — Ollama error in stream', () => {
  test('rejects with the Ollama error message', async () => {
    const events = [
      JSON.stringify({ error: 'pull model manifest: file does not exist' }),
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(events),
    });

    await expect(pullModel('llama3.2:11b', jest.fn()))
      .rejects.toThrow('pull model manifest: file does not exist');
  });

  test('does not call onProgress after an error event', async () => {
    const events = [
      JSON.stringify({ error: 'pull model manifest: file does not exist' }),
      JSON.stringify({ status: 'complete' }),
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(events),
    });

    const onProgress = jest.fn();
    await expect(pullModel('llama3.2:11b', onProgress)).rejects.toThrow();
    expect(onProgress).not.toHaveBeenCalled();
  });
});

describe('pullModel — HTTP error', () => {
  test('throws immediately on non-ok HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(pullModel('llama3.1:8b', jest.fn())).rejects.toThrow('HTTP 500');
  });
});
