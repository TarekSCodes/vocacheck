import {
  getDueCards,
  updateCardLevel,
  getSessionStats,
} from '../services/LeitnerService.js';

// ---------------------------------------------------------------------------
// Helper factory
// ---------------------------------------------------------------------------
function card(level, correctStreak = 0) {
  return { id: 'c1', level, correctStreak };
}

// ---------------------------------------------------------------------------
// updateCardLevel
// ---------------------------------------------------------------------------
describe('updateCardLevel', () => {
  test('correct answer increases level by 1', () => {
    const result = updateCardLevel(card(2), true);
    expect(result.level).toBe(3);
  });

  test('correct answer at level 5 stays at 5', () => {
    const result = updateCardLevel(card(5), true);
    expect(result.level).toBe(5);
  });

  test('correct answer increments correctStreak', () => {
    const result = updateCardLevel(card(2, 3), true);
    expect(result.correctStreak).toBe(4);
  });

  test('wrong answer resets level to 1', () => {
    const result = updateCardLevel(card(4), false);
    expect(result.level).toBe(1);
  });

  test('wrong answer resets correctStreak to 0', () => {
    const result = updateCardLevel(card(3, 5), false);
    expect(result.correctStreak).toBe(0);
  });

  test('wrong answer from level 1 stays at level 1', () => {
    const result = updateCardLevel(card(1), false);
    expect(result.level).toBe(1);
  });

  test('does not mutate the original card object', () => {
    const original = card(3, 2);
    updateCardLevel(original, true);
    expect(original.level).toBe(3);
    expect(original.correctStreak).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getDueCards
// ---------------------------------------------------------------------------
describe('getDueCards', () => {
  test('level 1 cards always included (session 0)', () => {
    const cards = [card(1)];
    expect(getDueCards(cards, 0)).toHaveLength(1);
  });

  test('level 1 cards always included (session 7)', () => {
    const cards = [card(1)];
    expect(getDueCards(cards, 7)).toHaveLength(1);
  });

  test('level 2 card included on even session (session 2)', () => {
    const cards = [{ ...card(2), id: 'c2' }];
    expect(getDueCards(cards, 2)).toHaveLength(1);
  });

  test('level 2 card excluded on odd session (session 1)', () => {
    const cards = [{ ...card(2), id: 'c2' }];
    expect(getDueCards(cards, 1)).toHaveLength(0);
  });

  test('level 5 card included only every 16th session (session 16)', () => {
    const cards = [{ ...card(5), id: 'c5' }];
    expect(getDueCards(cards, 16)).toHaveLength(1);
  });

  test('level 5 card excluded on non-16th session (session 8)', () => {
    const cards = [{ ...card(5), id: 'c5' }];
    expect(getDueCards(cards, 8)).toHaveLength(0);
  });

  test('empty deck returns empty array', () => {
    expect(getDueCards([], 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getSessionStats
// ---------------------------------------------------------------------------
describe('getSessionStats', () => {
  test('returns correct count per level', () => {
    const cards = [card(1), card(1), card(2), card(3), card(5)];
    const stats = getSessionStats(cards);
    expect(stats[1]).toBe(2);
    expect(stats[2]).toBe(1);
    expect(stats[3]).toBe(1);
    expect(stats[4]).toBe(0);
    expect(stats[5]).toBe(1);
  });

  test('returns all-zero object for empty array', () => {
    expect(getSessionStats([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});
