'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const CardStorage = require('../../storage/CardStorage');

let tmpdir;
let storage;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-cards-'));
  storage = new CardStorage(tmpdir);
});

afterEach(async () => {
  await fs.rm(tmpdir, { recursive: true, force: true });
});

describe('CardStorage — createCard', () => {
  test('new card saved with level=1, correctStreak=0, lastReviewed=null', async () => {
    const card = await storage.createCard({ deckId: 'deck-1', question: 'Q', answer: 'A' });
    expect(card.level).toBe(1);
    expect(card.correctStreak).toBe(0);
    expect(card.lastReviewed).toBeNull();
  });

  test('new card gets a valid UUID as id', async () => {
    const card = await storage.createCard({ deckId: 'deck-1', question: 'Q', answer: 'A' });
    expect(card.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('new card has correct deckId', async () => {
    const card = await storage.createCard({ deckId: 'deck-42', question: 'Q', answer: 'A' });
    expect(card.deckId).toBe('deck-42');
  });

  test('level=1 is enforced even if storage is called without enforcing (storage itself sets it)', async () => {
    // CardStorage always sets level:1 — verify via a direct file read
    await storage.createCard({ deckId: 'd', question: 'Q', answer: 'A' });
    const raw = JSON.parse(await fs.readFile(path.join(tmpdir, 'cards.json'), 'utf-8'));
    expect(raw[0].level).toBe(1);
  });
});

describe('CardStorage — updateCard', () => {
  test('updated card preserves all unchanged fields', async () => {
    const created = await storage.createCard({ deckId: 'deck-1', question: 'Q', answer: 'A' });
    const updated = await storage.updateCard(created.id, { level: 3, correctStreak: 2 });
    expect(updated.id).toBe(created.id);
    expect(updated.deckId).toBe(created.deckId);
    expect(updated.question).toBe(created.question);
    expect(updated.answer).toBe(created.answer);
    expect(updated.level).toBe(3);
    expect(updated.correctStreak).toBe(2);
  });

  test('throws CardStorageError for unknown id', async () => {
    const { default: CardStorageError } = await import('../../errors/CardStorageError.js').catch(
      () => ({ default: require('../../errors/CardStorageError') })
    );
    await expect(storage.updateCard('no-such-id', { level: 2 })).rejects.toBeInstanceOf(CardStorageError);
  });
});

describe('CardStorage — deleteCard', () => {
  test('deleted card no longer exists in file', async () => {
    const card = await storage.createCard({ deckId: 'deck-1', question: 'Q', answer: 'A' });
    await storage.deleteCard(card.id);
    const cards = await storage.getCardsByDeckId('deck-1');
    expect(cards.find((c) => c.id === card.id)).toBeUndefined();
  });
});

describe('CardStorage — getCardsByDeckId', () => {
  test('returns only cards of that deck', async () => {
    await storage.createCard({ deckId: 'deck-A', question: 'Q1', answer: 'A1' });
    await storage.createCard({ deckId: 'deck-B', question: 'Q2', answer: 'A2' });
    await storage.createCard({ deckId: 'deck-A', question: 'Q3', answer: 'A3' });
    const cards = await storage.getCardsByDeckId('deck-A');
    expect(cards).toHaveLength(2);
    expect(cards.every((c) => c.deckId === 'deck-A')).toBe(true);
  });

  test('returns empty array for unknown deckId', async () => {
    const cards = await storage.getCardsByDeckId('does-not-exist');
    expect(cards).toEqual([]);
  });

  test('returns empty array when data file does not exist yet', async () => {
    const cards = await storage.getCardsByDeckId('any-deck');
    expect(cards).toEqual([]);
  });

  test('throws CardStorageError when cards.json contains invalid JSON', async () => {
    const CardStorageError = require('../../errors/CardStorageError');
    await fs.writeFile(path.join(tmpdir, 'cards.json'), 'not-valid-json', 'utf-8');
    await expect(storage.getCardsByDeckId('deck-1')).rejects.toBeInstanceOf(CardStorageError);
  });
});
