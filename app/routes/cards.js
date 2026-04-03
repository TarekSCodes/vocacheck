const express = require('express');
const router = express.Router();
const CardStorage = require('../storage/CardStorage');
const CardStorageError = require('../errors/CardStorageError');
const logger = require('../logger');

const storage = new CardStorage();

/**
 * GET /api/cards?deckId=<uuid>
 *
 * Returns all cards belonging to the specified deck.
 * Performs lazy loading — only cards for the requested deck are returned.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.get('/', async (req, res, next) => {
  const { deckId } = req.query;
  if (!deckId) {
    return res.status(400).json({ error: 'deckId query parameter is required' });
  }
  try {
    const cards = await storage.getCardsByDeckId(deckId);
    logger.debug('CardRoute', `GET cards for deck ${deckId} — ${cards.length} result(s)`);
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cards
 *
 * Creates a new card in the given deck.
 * Always enforces level=1, correctStreak=0, lastReviewed=null regardless of body input.
 *
 * @param {import('express').Request} req - Body: { deckId, question, answer }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.post('/', async (req, res, next) => {
  const { deckId, question, answer } = req.body || {};
  if (!deckId) return res.status(400).json({ error: 'deckId is required' });
  if (!question) return res.status(400).json({ error: 'question is required' });
  if (!answer) return res.status(400).json({ error: 'answer is required' });
  try {
    const card = await storage.createCard({ deckId, question, answer });
    logger.info('CardRoute', `Card created: ${card.id} for deck ${deckId}`);
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/cards/:id
 *
 * Applies partial updates to an existing card (e.g. level, correctStreak after evaluation).
 * The fields id, deckId, and createdAt cannot be changed.
 * Returns 404 if no card with the given id exists.
 *
 * @param {import('express').Request} req - Body: Partial<Card>
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const card = await storage.updateCard(id, updates);
    logger.debug('CardRoute', `Card updated: ${id}`);
    res.json(card);
  } catch (err) {
    if (err instanceof CardStorageError && err.message === 'Card not found') {
      return res.status(404).json({ error: 'Card not found', id });
    }
    next(err);
  }
});

/**
 * DELETE /api/cards/:id
 *
 * Removes the card with the given id. Idempotent — succeeds even if the id
 * does not exist (no content is returned either way).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    await storage.deleteCard(id);
    logger.info('CardRoute', `Card deleted: ${id}`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
