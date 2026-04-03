/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} deckId
 * @property {string} question
 * @property {string} answer
 * @property {number} level         - Leitner level (1–5).
 * @property {number} correctStreak - Consecutive correct answers.
 * @property {string|null} lastReviewed
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Determines which cards are due for review in this session
 * based on their current Leitner level and session count.
 *
 * Level 1 → every session (interval 1)
 * Level 2 → every 2nd session (interval 2)
 * Level 3 → every 4th session (interval 4)
 * Level 4 → every 8th session (interval 8)
 * Level 5 → every 16th session (interval 16)
 *
 * @param {Card[]} allDeckCards - All cards of the active deck.
 * @param {number} sessionCount - Total completed sessions for this deck.
 * @returns {Card[]} Cards due for review.
 */
function getDueCards(allDeckCards, sessionCount) {
  return allDeckCards.filter((card) => {
    const interval = Math.pow(2, card.level - 1); // 1, 2, 4, 8, 16
    return sessionCount % interval === 0;
  });
}

/**
 * Updates the Leitner level of a card based on the evaluation result.
 * A correct answer promotes the card by one level (max level 5) and increments
 * the correctStreak. A wrong answer resets the card to level 1 and clears the streak.
 * Does NOT mutate the input card — returns a new object.
 *
 * @param {Card} card       - The card to update.
 * @param {boolean} correct - Whether the answer was evaluated as correct.
 * @returns {Card} Updated card object (does not mutate the input).
 */
function updateCardLevel(card, correct) {
  if (correct) {
    return {
      ...card,
      level: Math.min(5, card.level + 1),
      correctStreak: card.correctStreak + 1,
    };
  }
  return {
    ...card,
    level: 1,
    correctStreak: 0,
  };
}

/**
 * Returns the level distribution of the given cards.
 * Used to render the progress bar on the home screen.
 *
 * @param {Card[]} cards - Cards to analyse.
 * @returns {{ [level: number]: number }} Map of level → count.
 *
 * @example
 * getSessionStats(cards); // { 1: 12, 2: 5, 3: 3, 4: 0, 5: 0 }
 */
function getSessionStats(cards) {
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const card of cards) {
    if (stats[card.level] !== undefined) {
      stats[card.level]++;
    }
  }
  return stats;
}

module.exports = { getDueCards, updateCardLevel, getSessionStats };
