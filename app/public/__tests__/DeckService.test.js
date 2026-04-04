import {
  getAllDecks,
  createDeck,
  updateDeck,
  deleteDeck,
} from '../services/DeckService.js';

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
// Helper: build a minimal fetch response
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
// getAllDecks
// ---------------------------------------------------------------------------
describe('getAllDecks', () => {
  test('sends GET to /api/decks', async () => {
    global.fetch.mockResolvedValue(mockResponse([]));
    await getAllDecks();
    expect(global.fetch).toHaveBeenCalledWith('/api/decks');
  });

  test('returns parsed deck array', async () => {
    const decks = [{ id: 'd1', name: 'JS Basics', sessionCount: 0 }];
    global.fetch.mockResolvedValue(mockResponse(decks));
    const result = await getAllDecks();
    expect(result).toEqual(decks);
  });

  test('throws Error on non-2xx response', async () => {
    global.fetch.mockResolvedValue(mockResponse({ error: 'fail' }, 500));
    await expect(getAllDecks()).rejects.toThrow('HTTP 500');
  });
});

// ---------------------------------------------------------------------------
// createDeck
// ---------------------------------------------------------------------------
describe('createDeck', () => {
  test('sends POST /api/decks with name and description', async () => {
    const newDeck = { id: 'd1', name: 'JS Basics', sessionCount: 0 };
    global.fetch.mockResolvedValue(mockResponse(newDeck, 201));

    await createDeck({ name: 'JS Basics', description: 'Fundamentals' });

    expect(global.fetch).toHaveBeenCalledWith('/api/decks', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'JS Basics', description: 'Fundamentals' }),
    }));
  });

  test('returns created deck object (201)', async () => {
    const newDeck = { id: 'd1', name: 'JS Basics', sessionCount: 0 };
    global.fetch.mockResolvedValue(mockResponse(newDeck, 201));
    const result = await createDeck({ name: 'JS Basics' });
    expect(result).toEqual(newDeck);
  });

  test('throws Error on 400', async () => {
    global.fetch.mockResolvedValue(mockResponse({ error: 'name required' }, 400));
    await expect(createDeck({})).rejects.toThrow('HTTP 400');
  });
});

// ---------------------------------------------------------------------------
// updateDeck
// ---------------------------------------------------------------------------
describe('updateDeck', () => {
  test('sends PUT /api/decks/:id with updates as JSON body', async () => {
    const updated = { id: 'd1', name: 'Renamed', sessionCount: 3 };
    global.fetch.mockResolvedValue(mockResponse(updated));

    await updateDeck('d1', { name: 'Renamed', sessionCount: 3 });

    expect(global.fetch).toHaveBeenCalledWith('/api/decks/d1', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', sessionCount: 3 }),
    }));
  });

  test('returns updated deck object', async () => {
    const updated = { id: 'd1', name: 'Renamed' };
    global.fetch.mockResolvedValue(mockResponse(updated));
    const result = await updateDeck('d1', { name: 'Renamed' });
    expect(result).toEqual(updated);
  });

  test('throws Error on 404', async () => {
    global.fetch.mockResolvedValue(mockResponse({ error: 'Not Found' }, 404));
    await expect(updateDeck('missing', { name: 'x' })).rejects.toThrow('HTTP 404');
  });
});

// ---------------------------------------------------------------------------
// deleteDeck
// ---------------------------------------------------------------------------
describe('deleteDeck', () => {
  test('sends DELETE /api/decks/:id', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    await deleteDeck('d1');
    expect(global.fetch).toHaveBeenCalledWith('/api/decks/d1', { method: 'DELETE' });
  });

  test('resolves on 204', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    await expect(deleteDeck('d1')).resolves.toBeUndefined();
  });

  test('throws Error on 404', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404, text: async () => 'Not Found' });
    await expect(deleteDeck('missing')).rejects.toThrow('HTTP 404');
  });
});
