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
    lastReviewedSession: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('updateCardLevel', () => {
  test('correct answer increases level by 1', () => {
    const card = makeCard({ level: 2, correctStreak: 1 });
    const updated = updateCardLevel(card, true, 3);
    expect(updated.level).toBe(3);
  });

  test('correct answer at level 5 stays at 5', () => {
    const card = makeCard({ level: 5, correctStreak: 4 });
    const updated = updateCardLevel(card, true, 3);
    expect(updated.level).toBe(5);
  });

  test('correct answer increments correctStreak', () => {
    const card = makeCard({ level: 1, correctStreak: 2 });
    const updated = updateCardLevel(card, true, 3);
    expect(updated.correctStreak).toBe(3);
  });

  test('wrong answer resets level to 1', () => {
    const card = makeCard({ level: 4, correctStreak: 3 });
    const updated = updateCardLevel(card, false, 3);
    expect(updated.level).toBe(1);
  });

  test('wrong answer resets correctStreak to 0', () => {
    const card = makeCard({ level: 3, correctStreak: 2 });
    const updated = updateCardLevel(card, false, 3);
    expect(updated.correctStreak).toBe(0);
  });

  test('wrong answer from level 1 stays at level 1', () => {
    const card = makeCard({ level: 1, correctStreak: 0 });
    const updated = updateCardLevel(card, false, 3);
    expect(updated.level).toBe(1);
  });

  test('sets lastReviewedSession on correct answer', () => {
    const card = makeCard({ level: 1 });
    const updated = updateCardLevel(card, true, 5);
    expect(updated.lastReviewedSession).toBe(5);
  });

  test('sets lastReviewedSession on wrong answer', () => {
    const card = makeCard({ level: 3 });
    const updated = updateCardLevel(card, false, 7);
    expect(updated.lastReviewedSession).toBe(7);
  });

  test('does not mutate the input card', () => {
    const card = makeCard({ level: 2, correctStreak: 1 });
    updateCardLevel(card, true, 0);
    expect(card.level).toBe(2);
    expect(card.correctStreak).toBe(1);
  });
});

describe('getDueCards', () => {
  test('never-reviewed card (lastReviewedSession null) always due', () => {
    const cards = [makeCard({ level: 1, lastReviewedSession: null })];
    expect(getDueCards(cards, 0)).toHaveLength(1);
    expect(getDueCards(cards, 7)).toHaveLength(1);
  });

  test('level 1 card due every session after first review', () => {
    const cards = [makeCard({ level: 1, lastReviewedSession: 0 })];
    expect(getDueCards(cards, 1)).toHaveLength(1); // 1 - 0 = 1 >= 1
    expect(getDueCards(cards, 5)).toHaveLength(1); // 5 - 0 = 5 >= 1
  });

  test('level 2 card due after 2 sessions since last review', () => {
    const cards = [makeCard({ level: 2, lastReviewedSession: 0 })];
    expect(getDueCards(cards, 1)).toHaveLength(0); // 1 - 0 = 1 < 2
    expect(getDueCards(cards, 2)).toHaveLength(1); // 2 - 0 = 2 >= 2
    expect(getDueCards(cards, 3)).toHaveLength(1); // 3 - 0 = 3 >= 2
  });

  test('level 2 card scheduling respects lastReviewedSession', () => {
    const cards = [makeCard({ level: 2, lastReviewedSession: 4 })];
    expect(getDueCards(cards, 5)).toHaveLength(0); // 5 - 4 = 1 < 2
    expect(getDueCards(cards, 6)).toHaveLength(1); // 6 - 4 = 2 >= 2
  });

  test('level 5 card due after 16 sessions since last review', () => {
    const cards = [makeCard({ level: 5, lastReviewedSession: 0 })];
    expect(getDueCards(cards, 1)).toHaveLength(0);
    expect(getDueCards(cards, 8)).toHaveLength(0);
    expect(getDueCards(cards, 15)).toHaveLength(0);
    expect(getDueCards(cards, 16)).toHaveLength(1);
    expect(getDueCards(cards, 17)).toHaveLength(1);
  });

  test('cards at different levels do not bunch up', () => {
    const lv2 = makeCard({ id: 'lv2', level: 2, lastReviewedSession: 0 });
    const lv5 = makeCard({ id: 'lv5', level: 5, lastReviewedSession: 0 });
    // At session 16, lv5 is due — lv2 was already due earlier (session 2)
    // and should be due again (16 - 0 = 16 >= 2)
    const due = getDueCards([lv2, lv5], 16);
    expect(due).toHaveLength(2);
    // At session 2, only lv2 is due
    const dueSess2 = getDueCards([lv2, lv5], 2);
    expect(dueSess2).toHaveLength(1);
    expect(dueSess2[0].id).toBe('lv2');
  });

  test('empty deck returns empty array', () => {
    expect(getDueCards([], 5)).toEqual([]);
  });

  test('backward-compatible: undefined lastReviewedSession treated as null', () => {
    const card = { ...makeCard({ level: 3 }) };
    delete card.lastReviewedSession;
    expect(getDueCards([card], 0)).toHaveLength(1);
    expect(getDueCards([card], 10)).toHaveLength(1);
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
