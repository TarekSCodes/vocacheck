const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when a card cannot be read from or written to the JSON storage file.
 * Wraps underlying file system errors with additional context.
 *
 * @example
 * throw new CardStorageError('Failed to save card', { cardId: card.id, cause: err.message });
 */
class CardStorageError extends VocaCheckError {}

module.exports = CardStorageError;
