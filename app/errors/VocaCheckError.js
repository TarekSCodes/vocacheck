/**
 * Base error class for all VocaCheck application errors.
 * Subclass this to create domain-specific errors with structured context.
 */
class VocaCheckError extends Error {
  /**
   * @param {string} message - Human-readable error description.
   * @param {Object} [context={}] - Additional debug information (e.g. URLs, response bodies).
   */
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }
}

module.exports = VocaCheckError;
