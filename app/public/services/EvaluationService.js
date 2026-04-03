/**
 * @file EvaluationService.js
 * Orchestrates AI-powered answer evaluation (SPEC §2.5).
 * Builds the prompt, calls OllamaService, and parses the structured JSON response.
 */

import { generate } from './OllamaService.js';
import { SettingsService } from './SettingsService.js';
import { InvalidResponseError } from './errors.js';
import { LoggerService } from './LoggerService.js';

/**
 * System prompt sent to Ollama with every evaluation request (SPEC §2.5).
 * Hardcoded — never modified at runtime.
 *
 * @type {string}
 */
const SYSTEM_PROMPT = `You are an assistant that evaluates flashcard answers for a student learning tool.

Your task is to assess whether the user's answer is semantically correct,
not whether it is word-for-word identical to the model answer.

Key evaluation rules:
- The user does NOT need to reproduce the exact wording of the model answer.
- Bullet points, keywords, or paraphrased sentences are fully acceptable
  if they convey the correct meaning.
- Minor grammatical errors or incomplete sentences do not make an answer wrong.
- An answer is correct if its core statements match the intended meaning
  of the model answer.
- An answer is wrong if it contains factually incorrect statements or
  misses the essential concept entirely.

Always respond ONLY with a valid JSON object. No markdown, no explanation outside JSON:
{"correct": true/false, "feedback": "short feedback (1-2 sentences, same language as user answer)"}`;

/**
 * Builds the user-facing prompt that is sent to Ollama together with the
 * system prompt above.
 *
 * @param {string} question    - The flashcard question.
 * @param {string} modelAnswer - The reference/model answer stored on the card.
 * @param {string} userAnswer  - The answer provided by the learner.
 * @returns {string} Formatted user prompt.
 */
export function buildPrompt(question, modelAnswer, userAnswer) {
  return `Question: ${question}\nModel answer: ${modelAnswer}\nUser answer: ${userAnswer}`;
}

/**
 * Parses a raw JSON string from Ollama's response into a structured evaluation result.
 *
 * @param {string} raw - Raw text returned by Ollama (must be a JSON object).
 * @returns {{ correct: boolean, feedback: string }}
 * @throws {InvalidResponseError} When the text is not valid JSON, or when the
 *   `correct` (boolean) or `feedback` (string) fields are absent.
 */
export function parseResponse(raw) {
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

/**
 * Evaluates the learner's answer against the model answer using the locally
 * running Ollama LLM.
 *
 * Reads the active Ollama model from `SettingsService`. Throws the underlying
 * `OllamaConnectionError` or `InvalidResponseError` on failure so callers can
 * display appropriate error states.
 *
 * @param {string} question    - The flashcard question.
 * @param {string} modelAnswer - The reference answer stored on the card.
 * @param {string} userAnswer  - The learner's spoken or typed answer.
 * @returns {Promise<{ correct: boolean, feedback: string }>}
 * @throws {OllamaConnectionError}  When Ollama is unreachable.
 * @throws {InvalidResponseError}   When Ollama's reply cannot be parsed.
 */
export async function evaluate(question, modelAnswer, userAnswer) {
  const model = SettingsService.getOllamaModel();
  LoggerService.debug('EvaluationService', `evaluate — model: ${model}`);

  const userPrompt = buildPrompt(question, modelAnswer, userAnswer);
  const raw = await generate(userPrompt, SYSTEM_PROMPT, model);

  const result = parseResponse(raw);
  LoggerService.debug('EvaluationService', `evaluate — correct: ${result.correct}`);
  return result;
}
