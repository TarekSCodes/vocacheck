'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');

let tmpdir;
let app;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-int-decks-'));
  process.env.DATA_PATH = tmpdir;
  jest.resetModules();
  app = require('../../server');
});

afterEach(async () => {
  delete process.env.DATA_PATH;
  await fs.rm(tmpdir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createDeck(overrides = {}) {
  return request(app)
    .post('/api/decks')
    .send({ name: 'Test Deck', description: '', ...overrides });
}

async function createCard(deckId) {
  return request(app)
    .post('/api/cards')
    .send({ deckId, question: 'Q', answer: 'A' });
}

// ---------------------------------------------------------------------------
// GET /api/decks
// ---------------------------------------------------------------------------

describe('GET /api/decks', () => {
  test('returns empty array when no decks exist', async () => {
    const res = await request(app).get('/api/decks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all decks', async () => {
    await createDeck({ name: 'Deck A' });
    await createDeck({ name: 'Deck B' });
    const res = await request(app).get('/api/decks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// POST /api/decks
// ---------------------------------------------------------------------------

describe('POST /api/decks', () => {
  test('creates deck with correct fields', async () => {
    const res = await createDeck({ name: 'My Deck', description: 'AP2 prep' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('My Deck');
    expect(res.body.description).toBe('AP2 prep');
    expect(res.body.sessionCount).toBe(0);
    expect(res.body.createdAt).toBeDefined();
  });

  test('returns 400 if name is missing', async () => {
    const res = await request(app).post('/api/decks').send({ description: 'no name' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/decks/:id
// ---------------------------------------------------------------------------

describe('PUT /api/decks/:id', () => {
  test('updates deck name and returns updated deck', async () => {
    const deck = (await createDeck({ name: 'Old Name' })).body;
    const res = await request(app).put(`/api/decks/${deck.id}`).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.id).toBe(deck.id);
  });

  test('returns 404 for unknown deck id', async () => {
    const res = await request(app).put('/api/decks/no-such-id').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/decks/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/decks/:id', () => {
  test('removes deck from storage', async () => {
    const deck = (await createDeck()).body;
    const del = await request(app).delete(`/api/decks/${deck.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get('/api/decks');
    expect(get.body.find((d) => d.id === deck.id)).toBeUndefined();
  });

  test('removes all cards with matching deckId', async () => {
    const deck = (await createDeck()).body;
    await createCard(deck.id);
    await createCard(deck.id);

    await request(app).delete(`/api/decks/${deck.id}`);

    const cards = await request(app).get(`/api/cards?deckId=${deck.id}`);
    expect(cards.body).toHaveLength(0);
  });

  test('returns 404 for unknown deck id', async () => {
    const res = await request(app).delete('/api/decks/no-such-id');
    expect(res.status).toBe(404);
  });
});
