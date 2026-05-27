// app/public/services/ExportService.js

/**
 * @file ExportService.js
 * Reine Formatier-Funktion: wandelt ein Array von Karten in einen
 * formatierten Export-String um (kompatibel mit Quizlet, Anki u. a.).
 *
 * Keine HTTP-Aufrufe — nur Transformation. Aufrufer laden Karten über
 * CardService und übergeben sie hier.
 */

/**
 * Formatiert ein Array von Karten als durch Trennzeichen getrennten Text.
 * Exportiert ausschließlich `question` und `answer`.
 *
 * @param {Array<{question: string, answer: string}>} cards
 * @param {object} [options]
 * @param {string} [options.termDefSeparator='\t'] Trennzeichen zwischen Begriff und Definition
 * @param {string} [options.lineSeparator='\n']    Trennzeichen zwischen Karten
 * @returns {string}
 */
export function formatCards(cards, { termDefSeparator = '\t', lineSeparator = '\n' } = {}) {
  return cards
    .filter(c => c.question != null && c.answer != null && c.question !== '' && c.answer !== '')
    .map(c => `${c.question}${termDefSeparator}${c.answer}`)
    .join(lineSeparator);
}

export const ExportService = { formatCards };
