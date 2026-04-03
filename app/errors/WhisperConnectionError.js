const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when the Whisper ASR container cannot be reached.
 * Indicates a network or container availability problem.
 *
 * @example
 * throw new WhisperConnectionError('Whisper unreachable', { url: WHISPER_URL });
 */
class WhisperConnectionError extends VocaCheckError {}

module.exports = WhisperConnectionError;
