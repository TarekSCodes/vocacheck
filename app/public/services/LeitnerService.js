/**
 * @file LeitnerService.js
 * Pure functions for the Leitner spaced-repetition algorithm (SPEC §2.6).
 * No side effects — all functions return new objects / arrays without mutating
 * their inputs.
 */

/**
 * Returns the subset of cards that are due for review in the current session.
 *
 * Each card has a `level` (1–5). The review interval is `2^(level - 1)`:
 * - Level 1 → every session (interval 1)
 * - Level 2 → every 2nd session
 * - Level 3 → every 4th session
 * - Level 4 → every 8th session
 * - Level 5 → every 16th session
 *
 * A card is due when `sessionCount % interval === 0`.
 *
 * @param {Object[]} allDeckCards - All cards belonging to the active deck.
 * @param {number}   sessionCount - Total completed sessions for this deck.
 * @returns {Object[]} Cards due for review this session.
 */
export function getDueCards(allDeckCards, sessionCount) {
  return allDeckCards.filter((card) => {
    const interval = Math.pow(2, card.level - 1);
    return sessionCount % interval === 0;
  });
}

/**
 * Calculates the updated Leitner level and streak for a card after a review.
 * Does **not** mutate the input card — returns a new object.
 *
 * Correct answer: `level = min(5, level + 1)`, `correctStreak++`
 * Wrong answer:   `level = 1`,                 `correctStreak = 0`
 *
 * @param {Object}  card            - Card object with at minimum `level` and `correctStreak`.
 * @param {boolean} correct         - Whether the user's answer was correct.
 * @returns {Object} New card object with updated `level` and `correctStreak`.
 */
export function updateCardLevel(card, correct) {
  if (correct) {
    return {
      ...card,
      level: Math.min(5, card.level + 1),
      correctStreak: card.correctStreak + 1,
    };
  }
  return { ...card, level: 1, correctStreak: 0 };
}

/**
 * Returns the Leitner level distribution for a collection of cards.
 * Useful for rendering the progress bar on the home screen.
 *
 * @param {Object[]} cards - Array of card objects, each with a numeric `level` (1–5).
 * @returns {{ 1: number, 2: number, 3: number, 4: number, 5: number }}
 *   Count of cards at each level.
 */
export function getSessionStats(cards) {
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const card of cards) {
    if (stats[card.level] !== undefined) {
      stats[card.level]++;
    }
  }
  return stats;
}
