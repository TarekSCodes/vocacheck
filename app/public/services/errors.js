/**
 * @file errors.js
 * Browser-compatible VocaCheck error hierarchy.
 * Mirrors the backend error classes (app/errors/) as ES modules for use in
 * frontend services without a CommonJS dependency.
 */

/**
 * Base class for all VocaCheck errors.
 * Ensures `error.name` always matches the concrete class name and that an
 * optional `context` object is preserved for debugging.
 */
export class VocaCheckError extends Error {
  /**
   * @param {string} message - Human-readable error description.
   * @param {Object} [context={}] - Additional key-value debugging context.
   */
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }
}

/**
 * Thrown when the Whisper transcription service is unreachable or the
 * microphone permission is denied.
 */
export class WhisperConnectionError extends VocaCheckError {}

/**
 * Thrown when the Ollama language model service is unreachable or returns
 * a non-2xx HTTP status.
 */
export class OllamaConnectionError extends VocaCheckError {}

/**
 * Thrown when the AI response cannot be parsed or is missing required fields
 * (`correct`, `feedback`).
 */
export class InvalidResponseError extends VocaCheckError {}
