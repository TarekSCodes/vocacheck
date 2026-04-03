'use strict';

const { getDueCards, updateCardLevel, getSessionStats } = require('../../services/LeitnerService');

function makeCard(overrides = {}) {
  return {
    id: 'card-1',
    deckId: 'deck-1',
    question: 'Q',
    answer: 'A',
    level: 1,
    correctStreak: 0,
    lastReviewed: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('updateCardLevel', () => {
  test('correct answer increases level by 1', () => {
    const card = makeCard({ level: 2, correctStreak: 1 });
    const updated = updateCardLevel(card, true);
    expect(updated.level).toBe(3);
  });

  test('correct answer at level 5 stays at 5', () => {
    const card = makeCard({ level: 5, correctStreak: 4 });
    const updated = updateCardLevel(card, true);
    expect(updated.level).toBe(5);
  });

  test('correct answer increments correctStreak', () => {
    const card = makeCard({ level: 1, correctStreak: 2 });
    const updated = updateCardLevel(card, true);
    expect(updated.correctStreak).toBe(3);
  });

  test('wrong answer resets level to 1', () => {
    const card = makeCard({ level: 4, correctStreak: 3 });
    const updated = updateCardLevel(card, false);
    expect(updated.level).toBe(1);
  });

  test('wrong answer resets correctStreak to 0', () => {
    const card = makeCard({ level: 3, correctStreak: 2 });
    const updated = updateCardLevel(card, false);
    expect(updated.correctStreak).toBe(0);
  });

  test('wrong answer from level 1 stays at level 1', () => {
    const card = makeCard({ level: 1, correctStreak: 0 });
    const updated = updateCardLevel(card, false);
    expect(updated.level).toBe(1);
  });

  test('does not mutate the input card', () => {
    const card = makeCard({ level: 2, correctStreak: 1 });
    updateCardLevel(card, true);
    expect(card.level).toBe(2);
    expect(card.correctStreak).toBe(1);
  });
});

describe('getDueCards', () => {
  test('level 1 cards always included (sessionCount 0)', () => {
    const cards = [makeCard({ level: 1 })];
    expect(getDueCards(cards, 0)).toHaveLength(1);
  });

  test('level 1 cards always included (sessionCount 7)', () => {
    const cards = [makeCard({ level: 1 })];
    expect(getDueCards(cards, 7)).toHaveLength(1);
  });

  test('level 2 card included on even sessionCount', () => {
    const cards = [makeCard({ level: 2 })];
    expect(getDueCards(cards, 2)).toHaveLength(1);
    expect(getDueCards(cards, 4)).toHaveLength(1);
  });

  test('level 2 card excluded on odd sessionCount', () => {
    const cards = [makeCard({ level: 2 })];
    expect(getDueCards(cards, 1)).toHaveLength(0);
    expect(getDueCards(cards, 3)).toHaveLength(0);
  });

  test('level 5 card included only every 16th session', () => {
    const cards = [makeCard({ level: 5 })];
    expect(getDueCards(cards, 0)).toHaveLength(1);
    expect(getDueCards(cards, 16)).toHaveLength(1);
    expect(getDueCards(cards, 32)).toHaveLength(1);
    expect(getDueCards(cards, 1)).toHaveLength(0);
    expect(getDueCards(cards, 8)).toHaveLength(0);
    expect(getDueCards(cards, 15)).toHaveLength(0);
  });

  test('empty deck returns empty array', () => {
    expect(getDueCards([], 5)).toEqual([]);
  });
});

describe('getSessionStats', () => {
  test('returns level distribution', () => {
    const cards = [
      makeCard({ level: 1 }),
      makeCard({ level: 1 }),
      makeCard({ level: 2 }),
      makeCard({ level: 4 }),
    ];
    expect(getSessionStats(cards)).toEqual({ 1: 2, 2: 1, 3: 0, 4: 1, 5: 0 });
  });

  test('returns all zeros for empty array', () => {
    expect(getSessionStats([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});
