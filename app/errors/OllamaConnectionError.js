const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when the Ollama container cannot be reached.
 * Indicates a network or container availability problem.
 *
 * @example
 * throw new OllamaConnectionError('Ollama unreachable', { url: OLLAMA_URL });
 */
class OllamaConnectionError extends VocaCheckError {}

module.exports = OllamaConnectionError;
