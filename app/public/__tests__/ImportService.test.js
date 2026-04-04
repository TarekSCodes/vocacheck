import { parseText } from '../services/ImportService.js';

// ---------------------------------------------------------------------------
// parseText — default options (Tab + Newline)
// ---------------------------------------------------------------------------
describe('parseText — default options (Tab + Newline)', () => {
  test('parses tab-separated pairs, one per line', () => {
    const input = 'Hund\tDog\nKatze\tCat\nHaus\tHouse';
    expect(parseText(input)).toEqual([
      { question: 'Hund',  answer: 'Dog'   },
      { question: 'Katze', answer: 'Cat'   },
      { question: 'Haus',  answer: 'House' },
    ]);
  });

  test('empty string returns empty array', () => {
    expect(parseText('')).toEqual([]);
  });

  test('null / undefined input returns empty array', () => {
    expect(parseText(null)).toEqual([]);
    expect(parseText(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// termDefSeparator variants
// ---------------------------------------------------------------------------
describe('parseText — termDefSeparator variants', () => {
  test('comma as term-def separator', () => {
    const input = 'Apfel,Apple\nBirne,Pear';
    const result = parseText(input, { termDefSeparator: ',' });
    expect(result).toEqual([
      { question: 'Apfel', answer: 'Apple' },
      { question: 'Birne', answer: 'Pear'  },
    ]);
  });

  test('custom multi-char separator " - "', () => {
    const input = 'Datenschutz - Data protection\nSicherheit - Security';
    const result = parseText(input, { termDefSeparator: ' - ' });
    expect(result).toEqual([
      { question: 'Datenschutz', answer: 'Data protection' },
      { question: 'Sicherheit',  answer: 'Security'        },
    ]);
  });

  test('splits only on FIRST occurrence — answer may contain the separator', () => {
    // Answer itself contains a comma
    const input = 'Farbe,Rot, Grün, Blau';
    const result = parseText(input, { termDefSeparator: ',' });
    expect(result).toEqual([
      { question: 'Farbe', answer: 'Rot, Grün, Blau' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// lineSeparator variants
// ---------------------------------------------------------------------------
describe('parseText — lineSeparator variants', () => {
  test('semicolon as line separator', () => {
    const input = 'Hund\tDog;Katze\tCat';
    const result = parseText(input, { lineSeparator: ';' });
    expect(result).toEqual([
      { question: 'Hund',  answer: 'Dog' },
      { question: 'Katze', answer: 'Cat' },
    ]);
  });

  test('double newline as line separator', () => {
    const input = 'Hund\tDog\n\nKatze\tCat';
    const result = parseText(input, { lineSeparator: '\n\n' });
    expect(result).toEqual([
      { question: 'Hund',  answer: 'Dog' },
      { question: 'Katze', answer: 'Cat' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases — filtering and whitespace
// ---------------------------------------------------------------------------
describe('parseText — filtering and whitespace', () => {
  test('skips empty lines', () => {
    const input = 'Hund\tDog\n\nKatze\tCat\n';
    expect(parseText(input)).toEqual([
      { question: 'Hund',  answer: 'Dog' },
      { question: 'Katze', answer: 'Cat' },
    ]);
  });

  test('trims whitespace around question and answer', () => {
    const input = '  Hund  \t  Dog  ';
    expect(parseText(input)).toEqual([
      { question: 'Hund', answer: 'Dog' },
    ]);
  });

  test('skips lines that contain no termDefSeparator', () => {
    const input = 'Hund\tDog\nKeineZuweisung\nKatze\tCat';
    expect(parseText(input)).toEqual([
      { question: 'Hund',  answer: 'Dog' },
      { question: 'Katze', answer: 'Cat' },
    ]);
  });

  test('normalises Windows line endings (\\r\\n)', () => {
    const input = 'Hund\tDog\r\nKatze\tCat\r\nHaus\tHouse';
    expect(parseText(input)).toEqual([
      { question: 'Hund',  answer: 'Dog'   },
      { question: 'Katze', answer: 'Cat'   },
      { question: 'Haus',  answer: 'House' },
    ]);
  });

  test('returns correct count with mixed valid/invalid/empty lines', () => {
    const input = [
      'Hund\tDog',
      '',
      'NurEinWort',      // no separator → skipped
      'Katze\tCat',
      '   ',             // whitespace-only → skipped
      'Haus\tHouse',
    ].join('\n');
    const result = parseText(input);
    expect(result).toHaveLength(3);
  });
});
