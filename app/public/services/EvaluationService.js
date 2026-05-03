/**
 * @file EvaluationService.js
 * Orchestrates AI-powered answer evaluation and answer summarisation (SPEC §2.5).
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
- The answer was produced by automatic speech recognition (transcription) and WILL contain
  phonetically similar but misspelled words (e.g. "Zäudonym" instead of "Pseudonym").
  CRITICAL RULE: The moment you can identify what word or concept the user intended —
  even if only phonetically — you MUST evaluate based on that intended meaning.
  Recognising the intended term in your feedback while still marking the answer wrong
  is a direct contradiction and strictly forbidden. Spelling errors from transcription
  are never a valid reason to mark an answer wrong. Only penalise if the underlying
  concept itself is incorrect.
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
- Substitutes a key technical term with a different concept that merely sounds related
  (e.g. saying "IT service management" when the correct concept is "information security
  management" — surface-level proximity is not conceptual correctness)
- Misses critical concepts or key distinctions present in the model answer
- When the question asks about two or more distinct items, addresses them only
  as one undifferentiated block without identifying what is specific to each
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
 * Strips markdown code fences (```json ... ``` or ``` ... ```) from a raw LLM response.
 * LLMs sometimes wrap JSON in code fences despite being instructed not to.
 *
 * @param {string} raw
 * @returns {string}
 */
function stripCodeFences(raw) {
  return raw.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/m, '$1').trim();
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
    parsed = JSON.parse(stripCodeFences(raw));
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
 * Default system prompt for the bullet-point summarisation call.
 * Used as fallback when no custom summary prompt is stored in SettingsService.
 *
 * @type {string}
 */
export const DEFAULT_SUMMARY_PROMPT = `You are an assistant that condenses model answers into memorable bullet points for students.

Given a model answer, extract the key concepts as a JSON array of short, self-contained bullet points.

Rules:
- 3 to 6 bullet points maximum
- Each bullet point must be a standalone fact or concept — no filler words
- Use the same language as the model answer
- Do NOT include the question; focus only on what makes the answer correct
- Keep each bullet point short enough to memorize in one reading

Always respond ONLY with a valid JSON array of strings. No markdown, no explanation outside JSON:
["bullet point 1", "bullet point 2", "bullet point 3"]`;

/**
 * Parses a raw JSON string from Ollama's summarisation response into a string array.
 *
 * @param {string} raw - Raw text returned by Ollama (must be a JSON array of strings).
 * @returns {string[]}
 * @throws {InvalidResponseError} When the text is not valid JSON or not a string array.
 */
export function parseSummaryResponse(raw) {
  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new InvalidResponseError('Summary response is not valid JSON', { raw });
  }

  if (!Array.isArray(parsed) || !parsed.every(s => typeof s === 'string')) {
    throw new InvalidResponseError('Summary response must be a JSON array of strings', { parsed });
  }

  return parsed;
}

/**
 * Generates a compact bullet-point summary of the model answer using the locally
 * running Ollama LLM.
 *
 * This call is independent of `evaluate()` and can run in parallel with it.
 * Callers should treat failures as non-critical and handle them with `.catch(() => null)`.
 *
 * @param {string} modelAnswer - The reference answer stored on the card.
 * @returns {Promise<string[]>} Array of bullet-point strings.
 * @throws {OllamaConnectionError}  When Ollama is unreachable.
 * @throws {InvalidResponseError}   When Ollama's reply cannot be parsed.
 */
export async function summarize(modelAnswer) {
  const model = SettingsService.getOllamaModel();
  LoggerService.debug('EvaluationService', `summarize — model: ${model}`);

  const systemPrompt = SettingsService.getSummaryPrompt() ?? DEFAULT_SUMMARY_PROMPT;
  const raw = await generate(`Model answer: ${modelAnswer}`, systemPrompt, model);

  const bullets = parseSummaryResponse(raw);
  LoggerService.debug('EvaluationService', `summarize — ${bullets.length} bullets`);
  return bullets;
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
