const express = require('express');
const router = express.Router();
const DeckStorage = require('../storage/DeckStorage');
const DeckStorageError = require('../errors/DeckStorageError');
const logger = require('../logger');

const storage = new DeckStorage();

/**
 * GET /api/decks
 *
 * Returns all decks. Used to populate the home screen overview.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.get('/', async (req, res, next) => {
  try {
    const decks = await storage.getAllDecks();
    logger.debug('DeckRoute', `GET all decks — ${decks.length} result(s)`);
    res.json(decks);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/decks
 *
 * Creates a new deck. sessionCount is always initialised to 0.
 *
 * @param {import('express').Request} req - Body: { name, description? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.post('/', async (req, res, next) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const deck = await storage.createDeck({ name, description });
    logger.info('DeckRoute', `Deck created: ${deck.id} "${deck.name}"`);
    res.status(201).json(deck);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/decks/:id
 *
 * Applies partial updates to an existing deck (e.g. name, sessionCount).
 * The fields id and createdAt cannot be changed.
 * Returns 404 if no deck with the given id exists.
 *
 * @param {import('express').Request} req - Body: Partial<Deck>
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const deck = await storage.updateDeck(id, updates);
    logger.debug('DeckRoute', `Deck updated: ${id}`);
    res.json(deck);
  } catch (err) {
    if (err instanceof DeckStorageError && err.message === 'Deck not found') {
      return res.status(404).json({ error: 'Deck not found', id });
    }
    next(err);
  }
});

/**
 * DELETE /api/decks/:id
 *
 * Removes the deck and all cards belonging to it (cascade delete).
 * Returns 404 if no deck with the given id exists.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const decks = await storage.getAllDecks();
    const exists = decks.some(d => d.id === id);
    if (!exists) {
      return res.status(404).json({ error: 'Deck not found', id });
    }
    await storage.deleteDeck(id);
    logger.info('DeckRoute', `Deck deleted (cascade): ${id}`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
