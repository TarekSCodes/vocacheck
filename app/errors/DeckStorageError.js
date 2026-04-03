const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when a deck cannot be read from or written to the JSON storage file.
 * Wraps underlying file system errors with additional context.
 *
 * @example
 * throw new DeckStorageError('Failed to save deck', { deckId: deck.id, cause: err.message });
 */
class DeckStorageError extends VocaCheckError {}

module.exports = DeckStorageError;
