/**
 * @file ImportService.js
 * Pure text-parsing service for importing flashcards from external sources
 * (e.g. Quizlet copy-paste export).
 *
 * No HTTP calls — this module only transforms raw text into card objects.
 * Callers use CardService / DeckService to persist the results.
 */

import { LoggerService } from './LoggerService.js';

/**
 * Parses raw pasted text into an array of card objects.
 *
 * Splitting strategy:
 * 1. Normalise Windows line endings (`\r\n` → `\n`).
 * 2. Split the full text on `lineSeparator` to get individual card lines.
 * 3. For each line, split on the **first** occurrence of `termDefSeparator`
 *    so that the answer may itself contain the separator character.
 * 4. Trim surrounding whitespace from both question and answer.
 * 5. Skip lines that are empty or that do not contain `termDefSeparator`.
 *
 * @param {string} rawText - Pasted text from Quizlet or another flashcard tool.
 * @param {object} [options]
 * @param {string} [options.termDefSeparator='\t'] - Separator between term and definition.
 * @param {string} [options.lineSeparator='\n']    - Separator between cards.
 * @returns {Array<{question: string, answer: string}>} Parsed card pairs.
 */
export function parseText(rawText, { termDefSeparator = '\t', lineSeparator = '\n' } = {}) {
  if (!rawText || typeof rawText !== 'string') {
    LoggerService.debug('ImportService', 'parseText — empty or invalid input');
    return [];
  }

  // Normalise Windows line endings before splitting
  const normalised = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = normalised.split(lineSeparator);
  const cards = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue; // skip blank lines

    const sepIndex = trimmedLine.indexOf(termDefSeparator);
    if (sepIndex === -1) {
      LoggerService.debug('ImportService', `parseText — skipping line without separator: "${trimmedLine.slice(0, 40)}"`);
      continue; // skip lines that don't contain the separator
    }

    const question = trimmedLine.slice(0, sepIndex).trim();
    const answer   = trimmedLine.slice(sepIndex + termDefSeparator.length).trim();

    if (!question || !answer) continue; // skip if either side is empty after trim

    cards.push({ question, answer });
  }

  LoggerService.debug('ImportService', `parseText — ${cards.length} card(s) parsed`);
  return cards;
}

/**
 * Removes cards from parsedCards that are already present in existingCards.
 * Comparison is case-insensitive and ignores leading/trailing whitespace.
 * A card is considered a duplicate only when BOTH question AND answer match.
 *
 * @param {Array<{question: string, answer: string}>} parsedCards
 * @param {Array<{question: string, answer: string}>} existingCards
 * @returns {Array<{question: string, answer: string}>}
 */
export function filterDuplicates(parsedCards, existingCards) {
  if (!existingCards.length) return parsedCards;
  const seen = new Set(
    existingCards.map(c =>
      `${c.question.trim().toLowerCase()}\x00${c.answer.trim().toLowerCase()}`
    )
  );
  return parsedCards.filter(c =>
    !seen.has(`${c.question.trim().toLowerCase()}\x00${c.answer.trim().toLowerCase()}`)
  );
}

/**
 * Convenience object export so callers can do:
 * `import { ImportService } from './ImportService.js'`
 */
export const ImportService = { parseText, filterDuplicates };
