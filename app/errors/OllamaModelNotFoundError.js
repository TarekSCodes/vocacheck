const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when the requested Ollama model is not installed on the local instance.
 * The first-run setup assistant should be shown to the user in this case.
 *
 * @example
 * throw new OllamaModelNotFoundError('Model not found', { model: 'llama3.1:8b' });
 */
class OllamaModelNotFoundError extends VocaCheckError {}

module.exports = OllamaModelNotFoundError;
