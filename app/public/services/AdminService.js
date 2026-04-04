/**
 * @file AdminService.js
 * Wrappers for the admin API endpoints used by the first-run setup assistant
 * and the settings page.
 *
 * `pullModel` streams Server-Sent Events (SSE) from a POST endpoint using
 * `fetch` + `ReadableStream` because the native `EventSource` API only supports
 * GET requests.
 */

import { LoggerService } from './LoggerService.js';
import { VocaCheckError } from './errors.js';

/**
 * Checks whether Ollama is reachable and at least one model is installed.
 * This is the first-run guard — the UI redirects to setup.html when
 * `modelInstalled` is false.
 *
 * @returns {Promise<{ ollamaReachable: boolean, modelInstalled: boolean, models: string[] }>}
 * @throws {Error} When the request fails for a network-level reason.
 */
export async function getStatus() {
  LoggerService.debug('AdminService', 'getStatus');
  try {
    const res = await fetch('/api/admin/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.message && err.message.startsWith('HTTP ')) throw err;
    LoggerService.error('AdminService', 'getStatus — network error', err.message);
    throw new VocaCheckError(`Backend nicht erreichbar: ${err.message}`);
  }
}

/**
 * Checks whether the Ollama Docker container is configured with GPU access.
 *
 * @returns {Promise<{ gpuAvailable: boolean }>}
 * @throws {Error} When the request fails.
 */
export async function getGpuStatus() {
  LoggerService.debug('AdminService', 'getGpuStatus');
  try {
    const res = await fetch('/api/admin/gpu-status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.message && err.message.startsWith('HTTP ')) throw err;
    LoggerService.error('AdminService', 'getGpuStatus — network error', err.message);
    throw new VocaCheckError(`Backend nicht erreichbar: ${err.message}`);
  }
}

/**
 * Restarts the Whisper Docker container.
 * Required after the user changes the Whisper model in settings.
 *
 * @returns {Promise<{ success: boolean }>}
 * @throws {Error} When the container is not found or the request fails.
 */
export async function restartWhisper() {
  LoggerService.debug('AdminService', 'restartWhisper');
  try {
    const res = await fetch('/api/admin/restart-whisper', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.message && err.message.startsWith('HTTP ')) throw err;
    LoggerService.error('AdminService', 'restartWhisper — network error', err.message);
    throw new VocaCheckError(`Backend nicht erreichbar: ${err.message}`);
  }
}

/**
 * Triggers an Ollama model pull and streams progress to the caller.
 *
 * The backend endpoint (`POST /api/admin/pull-model`) returns Server-Sent Events.
 * Each event is a JSON object forwarded from Ollama's streaming pull API.
 * The stream ends with a synthetic `{"status":"complete"}` event.
 *
 * Uses `fetch` + `ReadableStream` instead of `EventSource` because `EventSource`
 * only supports GET requests.
 *
 * @param {string}   model      - Ollama model identifier to pull (e.g. `'llama3.1:8b'`).
 * @param {Function} onProgress - Callback invoked for each SSE event with the
 *   parsed event object (e.g. `{ status: 'pulling manifest' }`).
 * @returns {Promise<void>} Resolves when the `complete` event is received.
 * @throws {Error} When the request fails or Ollama returns a non-2xx status.
 */
export async function pullModel(model, onProgress) {
  LoggerService.info('AdminService', `pullModel — model: ${model}`);

  const res = await fetch('/api/admin/pull-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE lines look like: "data: {...}\n\n"
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const json = trimmed.slice('data:'.length).trim();
      if (!json) continue;

      let event;
      try {
        event = JSON.parse(json);
      } catch {
        LoggerService.warn('AdminService', `pullModel — could not parse SSE line: ${json}`);
        continue;
      }
      LoggerService.debug('AdminService', `pullModel event: ${event.status}`);
      if (event.error) {
        throw new Error(event.error);
      }
      if (typeof onProgress === 'function') onProgress(event);
    }
  }
}
