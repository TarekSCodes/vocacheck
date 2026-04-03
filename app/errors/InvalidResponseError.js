const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when the Ollama model returns a response that cannot be parsed
 * as the expected JSON structure `{ correct: boolean, feedback: string }`.
 *
 * @example
 * throw new InvalidResponseError('Unparseable AI response', { raw: responseText });
 */
class InvalidResponseError extends VocaCheckError {}

module.exports = InvalidResponseError;
