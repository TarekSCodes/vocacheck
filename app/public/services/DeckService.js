/**
 * @file DeckService.js
 * Fetch wrappers for all deck-related backend API endpoints.
 * All endpoints live under `/api/decks` and are served by the Express backend.
 * DELETE is a cascade operation — it also removes all cards belonging to the deck.
 */

import { LoggerService } from './LoggerService.js';

const BASE = '/api/decks';

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
 * Returns all decks.
 * Used to populate the home-screen deck overview.
 *
 * @returns {Promise<Object[]>} Array of deck objects (may be empty).
 * @throws {Error} When the request fails.
 */
export async function getAllDecks() {
  LoggerService.debug('DeckService', 'getAllDecks');
  const res = await fetch(BASE);
  await assertOk(res);
  return res.json();
}

/**
 * Creates a new deck.
 *
 * The backend always initialises `sessionCount` to `0`.
 *
 * @param {{ name: string, description?: string }} deck
 * @returns {Promise<Object>} The newly created deck object (HTTP 201).
 * @throws {Error} When `name` is missing (400) or the request fails.
 */
export async function createDeck({ name, description } = {}) {
  LoggerService.debug('DeckService', `createDeck — name: ${name}`);
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  await assertOk(res);
  return res.json();
}

/**
 * Updates mutable fields of a deck (e.g. `name`, `description`, `sessionCount`).
 * The fields `id` and `createdAt` are immutable and ignored by the backend.
 *
 * @param {string} id      - UUID of the deck to update.
 * @param {Object} updates - Partial deck object with fields to change.
 * @returns {Promise<Object>} The updated deck object.
 * @throws {Error} When the deck is not found (404) or the request fails.
 */
export async function updateDeck(id, updates) {
  LoggerService.debug('DeckService', `updateDeck — id: ${id}`);
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await assertOk(res);
  return res.json();
}

/**
 * Deletes a deck and **all of its cards** (cascade delete).
 * Returns 404 if the deck does not exist.
 *
 * @param {string} id - UUID of the deck to delete.
 * @returns {Promise<void>}
 * @throws {Error} When the deck is not found (404) or the request fails.
 */
export async function deleteDeck(id) {
  LoggerService.debug('DeckService', `deleteDeck — id: ${id}`);
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res);
}
