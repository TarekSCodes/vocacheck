import {
  getCards,
  createCard,
  updateCard,
  deleteCard,
} from '../services/CardService.js';

// ---------------------------------------------------------------------------
// Mock fetch globally for all tests in this file
// ---------------------------------------------------------------------------
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: build a minimal successful fetch response
// ---------------------------------------------------------------------------
function mockResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// getCards
// ---------------------------------------------------------------------------
describe('getCards', () => {
  test('sends GET to /api/cards?deckId=<id>', async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await getCards('deck-1');
    expect(global.fetch).toHaveBeenCalledWith('/api/cards?deckId=deck-1');
  });

  test('returns parsed JSON array from response', async () => {
    const cards = [{ id: 'c1', question: 'Q', answer: 'A' }];
    global.fetch.mockResolvedValue(mockResponse(cards));
    const result = await getCards('deck-1');
    expect(result).toEqual(cards);
  });

  test('throws Error on non-2xx response', async () => {
    global.fetch.mockResolvedValue(mockResponse({ error: 'fail' }, 500));
    await expect(getCards('deck-1')).rejects.toThrow('HTTP 500');
  });
});

// ---------------------------------------------------------------------------
// createCard
// ---------------------------------------------------------------------------
describe('createCard', () => {
  test('sends POST /api/cards with correct JSON body', async () => {
    const newCard = { id: 'c1', deckId: 'd1', question: 'Q', answer: 'A', level: 1 };
    global.fetch.mockResolvedValue(mockResponse(newCard, 201));

    await createCard({ deckId: 'd1', question: 'Q', answer: 'A' });

    expect(global.fetch).toHaveBeenCalledWith('/api/cards', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId: 'd1', question: 'Q', answer: 'A' }),
    }));
  });

  test('returns created card object', async () => {
    const newCard = { id: 'c1', level: 1 };
    global.fetch.mockResolvedValue(mockResponse(newCard, 201));
    const result = await createCard({ deckId: 'd1', question: 'Q', answer: 'A' });
    expect(result).toEqual(newCard);
  });

  test('throws Error on 400', async () => {
    global.fetch.mockResolvedValue(mockResponse({ error: 'Bad Request' }, 400));
    await expect(createCard({ deckId: 'd1', question: '', answer: '' })).rejects.toThrow('HTTP 400');
  });
});

// ---------------------------------------------------------------------------
// updateCard
// ---------------------------------------------------------------------------
describe('updateCard', () => {
  test('sends PUT /api/cards/:id with updates as JSON body', async () => {
    const updated = { id: 'c1', level: 2 };
    global.fetch.mockResolvedValue(mockResponse(updated));

    await updateCard('c1', { level: 2 });

    expect(global.fetch).toHaveBeenCalledWith('/api/cards/c1', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 2 }),
    }));
  });

  test('returns updated card object', async () => {
    const updated = { id: 'c1', level: 3 };
    global.fetch.mockResolvedValue(mockResponse(updated));
    const result = await updateCard('c1', { level: 3 });
    expect(result).toEqual(updated);
  });

  test('throws Error on 404', async () => {
    global.fetch.mockResolvedValue(mockResponse({ error: 'Not Found' }, 404));
    await expect(updateCard('missing', { level: 2 })).rejects.toThrow('HTTP 404');
  });
});

// ---------------------------------------------------------------------------
// deleteCard
// ---------------------------------------------------------------------------
describe('deleteCard', () => {
  test('sends DELETE /api/cards/:id', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' });

    await deleteCard('c1');

    expect(global.fetch).toHaveBeenCalledWith('/api/cards/c1', { method: 'DELETE' });
  });

  test('resolves without error on 204', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    await expect(deleteCard('c1')).resolves.toBeUndefined();
  });

  test('throws Error on non-2xx response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'Server error' });
    await expect(deleteCard('c1')).rejects.toThrow('HTTP 500');
  });
});
