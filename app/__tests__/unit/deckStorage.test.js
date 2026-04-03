'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const CardStorage = require('../../storage/CardStorage');
const DeckStorage = require('../../storage/DeckStorage');

let tmpdir;
let cardStorage;
let deckStorage;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-decks-'));
  cardStorage = new CardStorage(tmpdir);
  deckStorage = new DeckStorage(tmpdir, cardStorage);
});

afterEach(async () => {
  await fs.rm(tmpdir, { recursive: true, force: true });
});

describe('DeckStorage — createDeck', () => {
  test('new deck saved with sessionCount=0', async () => {
    const deck = await deckStorage.createDeck({ name: 'My Deck' });
    expect(deck.sessionCount).toBe(0);
  });

  test('new deck gets a valid UUID as id', async () => {
    const deck = await deckStorage.createDeck({ name: 'My Deck' });
    expect(deck.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('new deck stores the provided name', async () => {
    const deck = await deckStorage.createDeck({ name: 'Test Deck', description: 'Desc' });
    expect(deck.name).toBe('Test Deck');
    expect(deck.description).toBe('Desc');
  });

  test('returns empty array when data file does not exist yet', async () => {
    const decks = await deckStorage.getAllDecks();
    expect(decks).toEqual([]);
  });
});

describe('DeckStorage — updateDeck', () => {
  test('sessionCount increments on updateDeck call', async () => {
    const deck = await deckStorage.createDeck({ name: 'Deck' });
    const updated = await deckStorage.updateDeck(deck.id, { sessionCount: deck.sessionCount + 1 });
    expect(updated.sessionCount).toBe(1);
  });

  test('updated deck preserves unchanged fields', async () => {
    const deck = await deckStorage.createDeck({ name: 'Original', description: 'Desc' });
    const updated = await deckStorage.updateDeck(deck.id, { sessionCount: 1 });
    expect(updated.name).toBe('Original');
    expect(updated.description).toBe('Desc');
    expect(updated.id).toBe(deck.id);
  });

  test('throws DeckStorageError for unknown id', async () => {
    const DeckStorageError = require('../../errors/DeckStorageError');
    await expect(deckStorage.updateDeck('no-such-id', { name: 'X' })).rejects.toBeInstanceOf(DeckStorageError);
  });
});

describe('DeckStorage — getAllDecks errors', () => {
  test('throws DeckStorageError when decks.json contains invalid JSON', async () => {
    const DeckStorageError = require('../../errors/DeckStorageError');
    await fs.writeFile(path.join(tmpdir, 'decks.json'), 'not-valid-json', 'utf-8');
    await expect(deckStorage.getAllDecks()).rejects.toBeInstanceOf(DeckStorageError);
  });
});

describe('DeckStorage — deleteDeck', () => {
  test('removes deck from storage', async () => {
    const deck = await deckStorage.createDeck({ name: 'Deck' });
    await deckStorage.deleteDeck(deck.id);
    const decks = await deckStorage.getAllDecks();
    expect(decks.find((d) => d.id === deck.id)).toBeUndefined();
  });

  test('deleting deck also deletes all associated cards', async () => {
    const deck = await deckStorage.createDeck({ name: 'Deck' });
    await cardStorage.createCard({ deckId: deck.id, question: 'Q1', answer: 'A1' });
    await cardStorage.createCard({ deckId: deck.id, question: 'Q2', answer: 'A2' });
    await cardStorage.createCard({ deckId: 'other-deck', question: 'Q3', answer: 'A3' });

    await deckStorage.deleteDeck(deck.id);

    const remaining = await cardStorage.getCardsByDeckId(deck.id);
    expect(remaining).toHaveLength(0);

    const otherCards = await cardStorage.getCardsByDeckId('other-deck');
    expect(otherCards).toHaveLength(1);
  });
});
