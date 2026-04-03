/**
 * @file CardService.js
 * Fetch wrappers for all card-related backend API endpoints.
 * All endpoints live under `/api/cards` and are served by the Express backend.
 */

import { LoggerService } from './LoggerService.js';

const BASE = '/api/cards';

/**
 * Asserts that an HTTP response has a 2xx status.
 * Reads the response body and throws a descriptive `Error` on failure.
 *
 * @param {Response} res - Fetch Response object.
 * @returns {Promise<void>}
 * @throws {Error} When the status is not in the 200–299 range.
 */
async function assertOk(res) {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

/**
 * Returns all cards that belong to a specific deck.
 *
 * @param {string} deckId - UUID of the deck whose cards to fetch.
 * @returns {Promise<Object[]>} Array of card objects (may be empty).
 * @throws {Error} When the request fails or the server returns a non-2xx status.
 */
export async function getCards(deckId) {
  LoggerService.debug('CardService', `getCards — deckId: ${deckId}`);
  const res = await fetch(`${BASE}?deckId=${encodeURIComponent(deckId)}`);
  await assertOk(res);
  return res.json();
}

/**
 * Creates a new card in the specified deck.
 *
 * The backend always enforces `level = 1`, `correctStreak = 0`, and
 * `lastReviewed = null` regardless of what the caller sends.
 *
 * @param {{ deckId: string, question: string, answer: string }} card
 * @returns {Promise<Object>} The newly created card object (HTTP 201).
 * @throws {Error} When the request fails or a required field is missing (400).
 */
export async function createCard({ deckId, question, answer }) {
  LoggerService.debug('CardService', `createCard — deckId: ${deckId}`);
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deckId, question, answer }),
  });
  await assertOk(res);
  return res.json();
}

/**
 * Updates mutable fields of a card (e.g. `level`, `correctStreak`).
 * The fields `id`, `deckId`, and `createdAt` are immutable and ignored
 * by the backend even if included.
 *
 * @param {string} id       - UUID of the card to update.
 * @param {Object} updates  - Partial card object with fields to change.
 * @returns {Promise<Object>} The updated card object.
 * @throws {Error} When the card is not found (404) or the request fails.
 */
export async function updateCard(id, updates) {
  LoggerService.debug('CardService', `updateCard — id: ${id}`);
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await assertOk(res);
  return res.json();
}

/**
 * Deletes a card by its ID.
 * This operation is idempotent — deleting a non-existent card returns 204.
 *
 * @param {string} id - UUID of the card to delete.
 * @returns {Promise<void>}
 * @throws {Error} When the request fails for reasons other than "not found".
 */
export async function deleteCard(id) {
  LoggerService.debug('CardService', `deleteCard — id: ${id}`);
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res);
}
