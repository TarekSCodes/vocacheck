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
 * Default system prompt sent to Ollama with every evaluation request (SPEC §2.5).
 * Used as fallback when no custom prompt is stored in SettingsService.
 *
 * @type {string}
 */
export const DEFAULT_SYSTEM_PROMPT = `You are an assistant that evaluates flashcard answers for a student preparing for exams.

Your task is to assess whether the user's answer meets the standard required to pass
an exam question — not whether it is word-for-word identical to the model answer.

Evaluation rules:
- The user does NOT need to reproduce the exact wording of the model answer.
- Synonyms, paraphrases, and equivalent phrasings are acceptable.
- Minor grammatical errors or incomplete sentences do not make an answer wrong.
- The answer was produced by automatic speech recognition (transcription) and may contain
  phonetically similar but misspelled words (e.g. "Zäudonym" instead of "Pseudonym").
  Treat such transcription artifacts charitably: if the intended word is clear from context,
  evaluate based on the intended meaning — never penalise for speech-to-text errors.
- The order of listed items does NOT matter UNLESS the question explicitly requires a specific order.
- The QUESTION defines the scope and requirements — not the model answer.
  The model answer is a reference for what counts as correct content, not a checklist to reproduce.
  Example: if the question asks for "one example", giving one correct example is sufficient
  even if the model answer lists several.
- Giving MORE correct information than requested is NEVER wrong. If a question asks for one
  example and the user gives three correct ones, that is still fully correct — reward thoroughness,
  never penalise it.
- If the question asks for multiple distinct aspects (e.g. "explain both X and Y"),
  the user should address all of them. Omitting a minor detail is acceptable; leaving out
  a key concept that the question explicitly requires is not.

An answer is CORRECT if it demonstrates genuine understanding of the topic and covers
the essential content well enough to pass an exam.

An answer is WRONG if it:
- Only vaguely alludes to the topic without stating any concrete facts
  (e.g. "it has something to do with security or something like that")
- Relies heavily on filler phrases ("I think", "something like", "or something", "somehow")
  instead of stating clear, factual content
- Misses critical concepts or key distinctions present in the model answer
- Contains factually incorrect statements

Apply the same standard a teacher would use when grading an exam: the answer must show
real understanding — vague familiarity with the topic is not enough.

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
  const systemPrompt = SettingsService.getSystemPrompt() ?? DEFAULT_SYSTEM_PROMPT;
  const raw = await generate(userPrompt, systemPrompt, model);

  const result = parseResponse(raw);
  LoggerService.debug('EvaluationService', `evaluate — correct: ${result.correct}`);
  return result;
}
