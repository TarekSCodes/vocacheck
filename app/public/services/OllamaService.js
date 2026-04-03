/**
 * @file OllamaService.js
 * Low-level HTTP client for the Ollama language model service.
 * All requests are routed through the backend proxy at `/api/ollama/*`.
 */

import { OllamaConnectionError } from './errors.js';
import { LoggerService } from './LoggerService.js';

const GENERATE_URL = '/api/ollama/api/generate';

/**
 * Sends a generation request to Ollama and returns the model's text response.
 *
 * The request uses the non-streaming Ollama API (`stream: false`) so the full
 * response is returned as a single JSON object.
 *
 * @param {string} prompt       - The user-facing prompt text.
 * @param {string} systemPrompt - System instruction prepended to every request.
 * @param {string} model        - Ollama model identifier (e.g. `'llama3.1:8b'`).
 * @returns {Promise<string>} The raw text from the `response` field of Ollama's reply.
 * @throws {OllamaConnectionError} When the network request fails or Ollama returns
 *   a non-2xx HTTP status.
 */
export async function generate(prompt, systemPrompt, model) {
  LoggerService.debug('OllamaService', `generate — model: ${model}`);

  let res;
  try {
    res = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, system: systemPrompt, stream: false }),
    });
  } catch (err) {
    throw new OllamaConnectionError('Ollama request failed', {
      url: GENERATE_URL,
      cause: err.message,
    });
  }

  if (!res.ok) {
    throw new OllamaConnectionError(`Ollama returned HTTP ${res.status}`, {
      url: GENERATE_URL,
      status: res.status,
    });
  }

  const data = await res.json();
  LoggerService.debug('OllamaService', 'generate — response received');
  return data.response;
}
