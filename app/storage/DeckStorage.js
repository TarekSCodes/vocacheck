const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DeckStorageError = require('../errors/DeckStorageError');
const CardStorage = require('./CardStorage');

/**
 * @typedef {Object} Deck
 * @property {string} id           - UUID v4.
 * @property {string} name         - Display name of the deck.
 * @property {string} description  - Short description.
 * @property {number} sessionCount - Total completed review sessions for this deck.
 * @property {string} createdAt    - ISO timestamp of creation.
 * @property {string} updatedAt    - ISO timestamp of last update.
 */

/**
 * Handles all read/write operations for decks.json.
 * Cascade-deletes associated cards when a deck is removed.
 * The data directory is configurable via constructor argument,
 * defaulting to the DATA_PATH environment variable or /app/data.
 */
class DeckStorage {
  /**
   * @param {string} [dataPath] - Absolute path to the data directory.
   *   Defaults to `process.env.DATA_PATH || '/app/data'`.
   * @param {CardStorage} [cardStorage] - CardStorage instance used for cascade deletes.
   *   Defaults to a new CardStorage using the same dataPath.
   */
  constructor(
    dataPath = process.env.DATA_PATH || '/app/data',
    cardStorage = new CardStorage(dataPath)
  ) {
    this.dataPath = dataPath;
    this.cardStorage = cardStorage;
  }

  /**
   * Returns the absolute path to decks.json.
   *
   * @returns {string}
   */
  _filePath() {
    return path.join(this.dataPath, 'decks.json');
  }

  /**
   * Reads and parses all decks from disk.
   * Returns an empty array if the file does not exist yet (first run).
   *
   * @returns {Promise<Deck[]>}
   * @throws {DeckStorageError} On any file system error other than ENOENT.
   */
  async _readAll() {
    try {
      const raw = await fs.readFile(this._filePath(), 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new DeckStorageError('Failed to read decks.json', { cause: err.message });
    }
  }

  /**
   * Serialises the given decks array and writes it to disk.
   * Creates the data directory if it does not exist.
   *
   * @param {Deck[]} decks
   * @returns {Promise<void>}
   * @throws {DeckStorageError} On any file system error.
   */
  async _writeAll(decks) {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.writeFile(this._filePath(), JSON.stringify(decks, null, 2), 'utf-8');
    } catch (err) {
      throw new DeckStorageError('Failed to write decks.json', { cause: err.message });
    }
  }

  /**
   * Returns all decks.
   *
   * @returns {Promise<Deck[]>}
   * @throws {DeckStorageError}
   */
  async getAllDecks() {
    try {
      return await this._readAll();
    } catch (err) {
      if (err instanceof DeckStorageError) throw err;
      throw new DeckStorageError('Failed to get all decks', { cause: err.message });
    }
  }

  /**
   * Creates a new deck and persists it to disk.
   * Enforces sessionCount=0 regardless of any value in the input.
   *
   * @param {{ name: string, description?: string }} data
   * @returns {Promise<Deck>} The newly created deck.
   * @throws {DeckStorageError}
   */
  async createDeck({ name, description = '' }) {
    try {
      const decks = await this._readAll();
      const now = new Date().toISOString();
      const deck = {
        id: uuidv4(),
        name,
        description,
        sessionCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      decks.push(deck);
      await this._writeAll(decks);
      return deck;
    } catch (err) {
      if (err instanceof DeckStorageError) throw err;
      throw new DeckStorageError('Failed to create deck', { name, cause: err.message });
    }
  }

  /**
   * Applies partial updates to an existing deck and persists the result.
   * Always sets updatedAt to the current timestamp.
   * The fields `id` and `createdAt` are never overwritten by updates.
   *
   * @param {string} id - UUID of the deck to update.
   * @param {Partial<Deck>} updates - Fields to merge into the existing deck.
   * @returns {Promise<Deck>} The updated deck.
   * @throws {DeckStorageError} Also thrown if the deck is not found.
   */
  async updateDeck(id, updates) {
    try {
      const decks = await this._readAll();
      const index = decks.findIndex(d => d.id === id);
      if (index === -1) {
        throw new DeckStorageError('Deck not found', { id });
      }
      const { id: _id, createdAt: _createdAt, ...safeUpdates } = updates;
      decks[index] = {
        ...decks[index],
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      };
      await this._writeAll(decks);
      return decks[index];
    } catch (err) {
      if (err instanceof DeckStorageError) throw err;
      throw new DeckStorageError('Failed to update deck', { id, cause: err.message });
    }
  }

  /**
   * Removes a deck by its ID and cascade-deletes all associated cards.
   *
   * @param {string} id - UUID of the deck to delete.
   * @returns {Promise<void>}
   * @throws {DeckStorageError}
   */
  async deleteDeck(id) {
    try {
      const decks = await this._readAll();
      const filtered = decks.filter(d => d.id !== id);
      await this._writeAll(filtered);
      await this.cardStorage.deleteCardsByDeckId(id);
    } catch (err) {
      if (err instanceof DeckStorageError) throw err;
      throw new DeckStorageError('Failed to delete deck', { id, cause: err.message });
    }
  }
}

module.exports = DeckStorage;
