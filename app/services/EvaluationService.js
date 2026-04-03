const InvalidResponseError = require('../errors/InvalidResponseError');

/**
 * Builds the user-facing prompt sent to the Ollama LLM for answer evaluation.
 * The system prompt is defined separately and hardcoded in the Ollama call.
 *
 * @param {string} question    - The flashcard question.
 * @param {string} modelAnswer - The reference (model) answer.
 * @param {string} userAnswer  - The student's answer to evaluate.
 * @returns {string} The formatted user prompt string.
 */
function buildPrompt(question, modelAnswer, userAnswer) {
  return `Question: ${question}\nModel answer: ${modelAnswer}\nUser answer: ${userAnswer}`;
}

/**
 * Parses the raw string response from the Ollama LLM.
 * The model is expected to return a JSON object of the form:
 * `{ "correct": boolean, "feedback": "..." }`
 *
 * @param {string} raw - Raw string returned by the LLM.
 * @returns {{ correct: boolean, feedback: string }} Parsed evaluation result.
 * @throws {InvalidResponseError} If the response is not valid JSON, or if the
 *   required fields `correct` or `feedback` are missing.
 */
function parseResponse(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidResponseError('AI response is not valid JSON', { raw });
  }

  if (typeof parsed.correct !== 'boolean') {
    throw new InvalidResponseError('AI response missing required field: correct', { parsed });
  }
  if (typeof parsed.feedback !== 'string') {
    throw new InvalidResponseError('AI response missing required field: feedback', { parsed });
  }

  return { correct: parsed.correct, feedback: parsed.feedback };
}

module.exports = { buildPrompt, parseResponse };
