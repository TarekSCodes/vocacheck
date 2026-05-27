// app/public/__tests__/ExportService.test.js
import { formatCards } from '../services/ExportService.js';

// ---------------------------------------------------------------------------
// formatCards — Standardoptionen (Tab + Zeilenumbruch)
// ---------------------------------------------------------------------------
describe('formatCards — Standardoptionen (Tab + Zeilenumbruch)', () => {
  test('formatiert Karten mit Tab und Zeilenumbruch', () => {
    const cards = [
      { question: 'Hund',  answer: 'Dog'   },
      { question: 'Katze', answer: 'Cat'   },
      { question: 'Haus',  answer: 'House' },
    ];
    expect(formatCards(cards)).toBe('Hund\tDog\nKatze\tCat\nHaus\tHouse');
  });

  test('leeres Array gibt leeren String zurück', () => {
    expect(formatCards([])).toBe('');
  });

  test('einzelne Karte ohne abschließenden Zeilenumbruch', () => {
    const cards = [{ question: 'Apfel', answer: 'Apple' }];
    expect(formatCards(cards)).toBe('Apfel\tApple');
  });
});

// ---------------------------------------------------------------------------
// formatCards — termDefSeparator Varianten
// ---------------------------------------------------------------------------
describe('formatCards — termDefSeparator Varianten', () => {
  test('Komma als Begriff/Def-Trennzeichen', () => {
    const cards = [
      { question: 'Apfel', answer: 'Apple' },
      { question: 'Birne', answer: 'Pear'  },
    ];
    expect(formatCards(cards, { termDefSeparator: ',' }))
      .toBe('Apfel,Apple\nBirne,Pear');
  });

  test('benutzerdefiniertes mehrteiliges Trennzeichen " - "', () => {
    const cards = [{ question: 'Datenschutz', answer: 'Data protection' }];
    expect(formatCards(cards, { termDefSeparator: ' - ' }))
      .toBe('Datenschutz - Data protection');
  });
});

// ---------------------------------------------------------------------------
// formatCards — lineSeparator Varianten
// ---------------------------------------------------------------------------
describe('formatCards — lineSeparator Varianten', () => {
  test('Semikolon als Zeilentrennzeichen', () => {
    const cards = [
      { question: 'Hund',  answer: 'Dog' },
      { question: 'Katze', answer: 'Cat' },
    ];
    expect(formatCards(cards, { lineSeparator: ';' }))
      .toBe('Hund\tDog;Katze\tCat');
  });
});

// ---------------------------------------------------------------------------
// formatCards — nur question + answer exportiert
// ---------------------------------------------------------------------------
describe('formatCards — nur Frage und Antwort', () => {
  test('ignoriert Leitner-Level, Timestamps und andere Felder', () => {
    const cards = [{
      id: 'abc-123',
      deckId: 'deck-456',
      question: 'Hund',
      answer: 'Dog',
      level: 3,
      correctStreak: 5,
      lastReviewed: '2026-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }];
    expect(formatCards(cards)).toBe('Hund\tDog');
  });
});

// ---------------------------------------------------------------------------
// formatCards — fehlerhafte Karten werden gefiltert
// ---------------------------------------------------------------------------
describe('formatCards — fehlerhafte Karten werden gefiltert', () => {
  test('überspringt Karten mit null-Frage oder null-Antwort', () => {
    const cards = [
      { question: 'Hund',  answer: 'Dog'  },
      { question: null,    answer: 'Cat'  },
      { question: 'Haus',  answer: null   },
    ];
    expect(formatCards(cards)).toBe('Hund\tDog');
  });

  test('überspringt Karten mit leerem question oder answer', () => {
    const cards = [
      { question: 'Hund',  answer: 'Dog' },
      { question: '',      answer: 'Cat' },
      { question: 'Haus',  answer: ''   },
    ];
    expect(formatCards(cards)).toBe('Hund\tDog');
  });
});
