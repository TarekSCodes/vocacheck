const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when an administrative Docker command fails (e.g. container restart,
 * model pull). Wraps the underlying command error with additional context.
 *
 * @example
 * throw new AdminCommandError('Container restart failed', { container: 'whisper', cause: err.message });
 */
class AdminCommandError extends VocaCheckError {}

module.exports = AdminCommandError;
