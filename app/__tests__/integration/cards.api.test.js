'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');

let tmpdir;
let app;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'vocacheck-int-cards-'));
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

async function createCard(overrides = {}) {
  const res = await request(app)
    .post('/api/cards')
    .send({ deckId: 'deck-1', question: 'Q', answer: 'A', ...overrides });
  return res;
}

// ---------------------------------------------------------------------------
// GET /api/cards?deckId=x
// ---------------------------------------------------------------------------

describe('GET /api/cards?deckId=x', () => {
  test('returns only cards matching deckId', async () => {
    await createCard({ deckId: 'deck-1', question: 'Q1', answer: 'A1' });
    await createCard({ deckId: 'deck-2', question: 'Q2', answer: 'A2' });
    await createCard({ deckId: 'deck-1', question: 'Q3', answer: 'A3' });

    const res = await request(app).get('/api/cards?deckId=deck-1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((c) => c.deckId === 'deck-1')).toBe(true);
  });

  test('returns 200 with empty array for unknown deckId', async () => {
    const res = await request(app).get('/api/cards?deckId=unknown-deck');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 400 if deckId param missing', async () => {
    const res = await request(app).get('/api/cards');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/cards
// ---------------------------------------------------------------------------

describe('POST /api/cards', () => {
  test('creates card with all required fields', async () => {
    const res = await createCard({ deckId: 'deck-1', question: 'What is JS?', answer: 'A language' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.deckId).toBe('deck-1');
    expect(res.body.question).toBe('What is JS?');
    expect(res.body.answer).toBe('A language');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  test('new card has level=1 regardless of any input', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ deckId: 'deck-1', question: 'Q', answer: 'A', level: 5 });
    expect(res.status).toBe(201);
    expect(res.body.level).toBe(1);
  });

  test('returns 400 if question is missing', async () => {
    const res = await request(app).post('/api/cards').send({ deckId: 'deck-1', answer: 'A' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if answer is missing', async () => {
    const res = await request(app).post('/api/cards').send({ deckId: 'deck-1', question: 'Q' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if deckId is missing', async () => {
    const res = await request(app).post('/api/cards').send({ question: 'Q', answer: 'A' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/cards/:id
// ---------------------------------------------------------------------------

describe('PUT /api/cards/:id', () => {
  test('updates card fields and returns updated card', async () => {
    const created = (await createCard()).body;
    const res = await request(app)
      .put(`/api/cards/${created.id}`)
      .send({ level: 3, correctStreak: 2 });
    expect(res.status).toBe(200);
    expect(res.body.level).toBe(3);
    expect(res.body.correctStreak).toBe(2);
  });

  test('returns 404 for unknown card id', async () => {
    const res = await request(app).put('/api/cards/no-such-id').send({ level: 2 });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/cards/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/cards/:id', () => {
  test('removes the card and returns 204', async () => {
    const created = (await createCard()).body;
    const del = await request(app).delete(`/api/cards/${created.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get('/api/cards?deckId=deck-1');
    expect(get.body.find((c) => c.id === created.id)).toBeUndefined();
  });

  test('returns 204 even for unknown id (idempotent)', async () => {
    const res = await request(app).delete('/api/cards/no-such-id');
    expect(res.status).toBe(204);
  });
});
