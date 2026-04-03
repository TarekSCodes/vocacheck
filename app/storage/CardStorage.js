const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const CardStorageError = require('../errors/CardStorageError');

/**
 * @typedef {Object} Card
 * @property {string} id            - UUID v4.
 * @property {string} deckId        - UUID of the owning deck.
 * @property {string} question      - The question text.
 * @property {string} answer        - The model answer text.
 * @property {number} level         - Leitner level (1–5).
 * @property {number} correctStreak - Number of consecutive correct answers.
 * @property {string|null} lastReviewed - ISO timestamp of last review, or null.
 * @property {string} createdAt     - ISO timestamp of creation.
 * @property {string} updatedAt     - ISO timestamp of last update.
 */

/**
 * Handles all read/write operations for cards.json.
 * The data directory is configurable via constructor argument,
 * defaulting to the DATA_PATH environment variable or /app/data.
 */
class CardStorage {
  /**
   * @param {string} [dataPath] - Absolute path to the data directory.
   *   Defaults to `process.env.DATA_PATH || '/app/data'`.
   */
  constructor(dataPath = process.env.DATA_PATH || '/app/data') {
    this.dataPath = dataPath;
  }

  /**
   * Returns the absolute path to cards.json.
   *
   * @returns {string}
   */
  _filePath() {
    return path.join(this.dataPath, 'cards.json');
  }

  /**
   * Reads and parses all cards from disk.
   * Returns an empty array if the file does not exist yet (first run).
   *
   * @returns {Promise<Card[]>}
   * @throws {CardStorageError} On any file system error other than ENOENT.
   */
  async _readAll() {
    try {
      const raw = await fs.readFile(this._filePath(), 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new CardStorageError('Failed to read cards.json', { cause: err.message });
    }
  }

  /**
   * Serialises the given cards array and writes it to disk.
   * Creates the data directory if it does not exist.
   *
   * @param {Card[]} cards
   * @returns {Promise<void>}
   * @throws {CardStorageError} On any file system error.
   */
  async _writeAll(cards) {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.writeFile(this._filePath(), JSON.stringify(cards, null, 2), 'utf-8');
    } catch (err) {
      throw new CardStorageError('Failed to write cards.json', { cause: err.message });
    }
  }

  /**
   * Returns all cards belonging to the given deck.
   *
   * @param {string} deckId - UUID of the deck to filter by.
   * @returns {Promise<Card[]>}
   * @throws {CardStorageError}
   */
  async getCardsByDeckId(deckId) {
    try {
      const cards = await this._readAll();
      return cards.filter(c => c.deckId === deckId);
    } catch (err) {
      if (err instanceof CardStorageError) throw err;
      throw new CardStorageError('Failed to get cards by deckId', { deckId, cause: err.message });
    }
  }

  /**
   * Creates a new card and persists it to disk.
   * Enforces Leitner defaults regardless of any values in the input:
   * level=1, correctStreak=0, lastReviewed=null.
   *
   * @param {{ deckId: string, question: string, answer: string }} data
   * @returns {Promise<Card>} The newly created card.
   * @throws {CardStorageError}
   */
  async createCard({ deckId, question, answer }) {
    try {
      const cards = await this._readAll();
      const now = new Date().toISOString();
      const card = {
        id: uuidv4(),
        deckId,
        question,
        answer,
        level: 1,
        correctStreak: 0,
        lastReviewed: null,
        createdAt: now,
        updatedAt: now,
      };
      cards.push(card);
      await this._writeAll(cards);
      return card;
    } catch (err) {
      if (err instanceof CardStorageError) throw err;
      throw new CardStorageError('Failed to create card', { deckId, cause: err.message });
    }
  }

  /**
   * Applies partial updates to an existing card and persists the result.
   * Always sets updatedAt to the current timestamp.
   * The fields `id`, `deckId`, `createdAt` are never overwritten by updates.
   *
   * @param {string} id - UUID of the card to update.
   * @param {Partial<Card>} updates - Fields to merge into the existing card.
   * @returns {Promise<Card>} The updated card.
   * @throws {CardStorageError} Also thrown if the card is not found.
   */
  async updateCard(id, updates) {
    try {
      const cards = await this._readAll();
      const index = cards.findIndex(c => c.id === id);
      if (index === -1) {
        throw new CardStorageError('Card not found', { id });
      }
      const { id: _id, deckId: _deckId, createdAt: _createdAt, ...safeUpdates } = updates;
      cards[index] = {
        ...cards[index],
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      };
      await this._writeAll(cards);
      return cards[index];
    } catch (err) {
      if (err instanceof CardStorageError) throw err;
      throw new CardStorageError('Failed to update card', { id, cause: err.message });
    }
  }

  /**
   * Removes a single card by its ID.
   *
   * @param {string} id - UUID of the card to delete.
   * @returns {Promise<void>}
   * @throws {CardStorageError}
   */
  async deleteCard(id) {
    try {
      const cards = await this._readAll();
      const filtered = cards.filter(c => c.id !== id);
      await this._writeAll(filtered);
    } catch (err) {
      if (err instanceof CardStorageError) throw err;
      throw new CardStorageError('Failed to delete card', { id, cause: err.message });
    }
  }

  /**
   * Removes all cards belonging to the given deck.
   * Called by DeckStorage.deleteDeck() to enforce cascade deletion.
   *
   * @param {string} deckId - UUID of the deck whose cards should be deleted.
   * @returns {Promise<void>}
   * @throws {CardStorageError}
   */
  async deleteCardsByDeckId(deckId) {
    try {
      const cards = await this._readAll();
      const filtered = cards.filter(c => c.deckId !== deckId);
      await this._writeAll(filtered);
    } catch (err) {
      if (err instanceof CardStorageError) throw err;
      throw new CardStorageError('Failed to delete cards by deckId', { deckId, cause: err.message });
    }
  }
}

module.exports = CardStorage;
