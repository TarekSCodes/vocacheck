import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  buildPrompt,
  parseResponse,
  parseSummaryResponse,
  evaluate,
  summarize,
} from '../services/EvaluationService.js';
import { generate } from '../services/OllamaService.js';
import { SettingsService } from '../services/SettingsService.js';
import { InvalidResponseError, OllamaConnectionError } from '../services/errors.js';

jest.mock('../services/OllamaService.js');
jest.mock('../services/SettingsService.js');

afterEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// DEFAULT_SYSTEM_PROMPT
// ---------------------------------------------------------------------------
describe('DEFAULT_SYSTEM_PROMPT', () => {
  test('references exam standard as the evaluation criterion', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('exam');
  });

  test('states that the question defines scope — not the model answer', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('QUESTION defines the scope');
  });

  test('explicitly allows giving more information than requested', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('MORE correct information');
  });

  test('handles speech-recognition / transcription artifacts charitably', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('transcription');
  });

  test('accepts synonyms and paraphrases as correct', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Synonyms, paraphrases');
  });
});

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------
describe('buildPrompt', () => {
  test('includes question, modelAnswer, userAnswer in the returned string', () => {
    const result = buildPrompt('What is OOP?', 'Object-oriented programming', 'OOP is a paradigm');
    expect(result).toContain('What is OOP?');
    expect(result).toContain('Object-oriented programming');
    expect(result).toContain('OOP is a paradigm');
  });

  test('does not include unrelated card fields', () => {
    const result = buildPrompt('Q', 'MA', 'UA');
    expect(result).not.toContain('level');
    expect(result).not.toContain('correctStreak');
    expect(result).not.toContain('deckId');
  });
});

// ---------------------------------------------------------------------------
// parseResponse
// ---------------------------------------------------------------------------
describe('parseResponse', () => {
  test('valid JSON with correct: true is parsed correctly', () => {
    const result = parseResponse('{"correct":true,"feedback":"Well done"}');
    expect(result).toEqual({ correct: true, feedback: 'Well done' });
  });

  test('valid JSON with correct: false is parsed correctly', () => {
    const result = parseResponse('{"correct":false,"feedback":"Try again"}');
    expect(result).toEqual({ correct: false, feedback: 'Try again' });
  });

  test('invalid JSON string throws InvalidResponseError', () => {
    expect(() => parseResponse('not json')).toThrow(InvalidResponseError);
  });

  test('JSON missing correct field throws InvalidResponseError', () => {
    expect(() => parseResponse('{"feedback":"ok"}')).toThrow(InvalidResponseError);
  });

  test('JSON missing feedback field throws InvalidResponseError', () => {
    expect(() => parseResponse('{"correct":true}')).toThrow(InvalidResponseError);
  });
});

// ---------------------------------------------------------------------------
// evaluate
// ---------------------------------------------------------------------------
describe('evaluate', () => {
  test('calls generate() with userPrompt, SYSTEM_PROMPT, and model from settings', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    generate.mockResolvedValue('{"correct":true,"feedback":"Correct!"}');

    await evaluate('Q', 'MA', 'UA');

    expect(generate).toHaveBeenCalledTimes(1);
    const [userPrompt, systemPrompt, model] = generate.mock.calls[0];
    expect(userPrompt).toContain('Q');
    expect(userPrompt).toContain('MA');
    expect(userPrompt).toContain('UA');
    expect(systemPrompt).toContain('flashcard');
    expect(model).toBe('llama3.1:8b');
  });

  test('returns { correct, feedback } on successful response', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    generate.mockResolvedValue('{"correct":false,"feedback":"Needs work"}');

    const result = await evaluate('Q', 'MA', 'UA');
    expect(result).toEqual({ correct: false, feedback: 'Needs work' });
  });

  test('uses custom system prompt from SettingsService when one is stored', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    SettingsService.getSystemPrompt.mockReturnValue('Custom prompt for testing');
    generate.mockResolvedValue('{"correct":true,"feedback":"ok"}');

    await evaluate('Q', 'MA', 'UA');

    const [, systemPrompt] = generate.mock.calls[0];
    expect(systemPrompt).toBe('Custom prompt for testing');
  });

  test('throws OllamaConnectionError when generate() rejects', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    generate.mockRejectedValue(new OllamaConnectionError('Ollama down'));

    await expect(evaluate('Q', 'MA', 'UA')).rejects.toThrow(OllamaConnectionError);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_SUMMARY_PROMPT
// ---------------------------------------------------------------------------
describe('DEFAULT_SUMMARY_PROMPT', () => {
  test('requires bullet-point format in the prompt', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('bullet');
  });

  test('requires a JSON array as output format', () => {
    expect(DEFAULT_SUMMARY_PROMPT).toContain('JSON array');
  });
});

// ---------------------------------------------------------------------------
// parseSummaryResponse
// ---------------------------------------------------------------------------
describe('parseSummaryResponse', () => {
  test('valid JSON array of strings is parsed correctly', () => {
    const result = parseSummaryResponse('["point one","point two","point three"]');
    expect(result).toEqual(['point one', 'point two', 'point three']);
  });

  test('invalid JSON string throws InvalidResponseError', () => {
    expect(() => parseSummaryResponse('not json')).toThrow(InvalidResponseError);
  });

  test('JSON object (not an array) throws InvalidResponseError', () => {
    expect(() => parseSummaryResponse('{"key":"value"}')).toThrow(InvalidResponseError);
  });

  test('array containing non-strings throws InvalidResponseError', () => {
    expect(() => parseSummaryResponse('[1, 2, 3]')).toThrow(InvalidResponseError);
  });
});

// ---------------------------------------------------------------------------
// summarize
// ---------------------------------------------------------------------------
describe('summarize', () => {
  test('calls generate() with modelAnswer and summary system prompt', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    generate.mockResolvedValue('["point one","point two"]');

    await summarize('The model answer text');

    expect(generate).toHaveBeenCalledTimes(1);
    const [userPrompt, systemPrompt, model] = generate.mock.calls[0];
    expect(userPrompt).toContain('The model answer text');
    expect(systemPrompt).toContain('bullet');
    expect(model).toBe('llama3.1:8b');
  });

  test('returns a string array on successful response', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    generate.mockResolvedValue('["fact A","fact B","fact C"]');

    const result = await summarize('Some answer');
    expect(result).toEqual(['fact A', 'fact B', 'fact C']);
  });

  test('uses custom summary prompt from SettingsService when one is stored', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    SettingsService.getSummaryPrompt.mockReturnValue('Custom summary prompt');
    generate.mockResolvedValue('["point"]');

    await summarize('Some answer');

    const [, systemPrompt] = generate.mock.calls[0];
    expect(systemPrompt).toBe('Custom summary prompt');
  });

  test('throws OllamaConnectionError when generate() rejects', async () => {
    SettingsService.getOllamaModel.mockReturnValue('llama3.1:8b');
    generate.mockRejectedValue(new OllamaConnectionError('Ollama down'));

    await expect(summarize('Some answer')).rejects.toThrow(OllamaConnectionError);
  });
});
