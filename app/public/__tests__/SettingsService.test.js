import { SettingsService } from '../services/SettingsService.js';

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// getOllamaModel
// ---------------------------------------------------------------------------
describe('getOllamaModel', () => {
  test("returns 'llama3.1:8b' as default when nothing is stored", () => {
    expect(SettingsService.getOllamaModel()).toBe('llama3.1:8b');
  });

  test('returns stored value after setOllamaModel()', () => {
    SettingsService.setOllamaModel('mistral:7b');
    expect(SettingsService.getOllamaModel()).toBe('mistral:7b');
  });
});

// ---------------------------------------------------------------------------
// setOllamaModel
// ---------------------------------------------------------------------------
describe('setOllamaModel', () => {
  test('persists model name to localStorage', () => {
    SettingsService.setOllamaModel('gemma:2b');
    expect(localStorage.getItem('vocacheck_ollama_model')).toBe('gemma:2b');
  });
});

// ---------------------------------------------------------------------------
// getWhisperModel
// ---------------------------------------------------------------------------
describe('getWhisperModel', () => {
  test("returns 'small' as default when nothing is stored", () => {
    expect(SettingsService.getWhisperModel()).toBe('small');
  });

  test('returns stored value after setWhisperModel()', () => {
    SettingsService.setWhisperModel('medium');
    expect(SettingsService.getWhisperModel()).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// setWhisperModel
// ---------------------------------------------------------------------------
describe('setWhisperModel', () => {
  test('persists model to localStorage', () => {
    SettingsService.setWhisperModel('large');
    expect(localStorage.getItem('vocacheck_whisper_model')).toBe('large');
  });
});

// ---------------------------------------------------------------------------
// getAll
// ---------------------------------------------------------------------------
describe('getAll', () => {
  test('returns { ollamaModel, whisperModel } with default values', () => {
    expect(SettingsService.getAll()).toEqual({
      ollamaModel: 'llama3.1:8b',
      whisperModel: 'small',
    });
  });

  test('returns current stored values', () => {
    SettingsService.setOllamaModel('mistral:7b');
    SettingsService.setWhisperModel('medium');
    expect(SettingsService.getAll()).toEqual({
      ollamaModel: 'mistral:7b',
      whisperModel: 'medium',
    });
  });
});

// ---------------------------------------------------------------------------
// setAll
// ---------------------------------------------------------------------------
describe('setAll', () => {
  test('updates both models when both are provided', () => {
    SettingsService.setAll({ ollamaModel: 'phi3:mini', whisperModel: 'large' });
    expect(SettingsService.getOllamaModel()).toBe('phi3:mini');
    expect(SettingsService.getWhisperModel()).toBe('large');
  });

  test('skips a key when its value is an empty string', () => {
    SettingsService.setOllamaModel('mistral:7b');
    SettingsService.setAll({ ollamaModel: '', whisperModel: 'medium' });
    expect(SettingsService.getOllamaModel()).toBe('mistral:7b'); // unchanged
    expect(SettingsService.getWhisperModel()).toBe('medium');
  });

  test('handles missing keys gracefully without throwing', () => {
    expect(() => SettingsService.setAll({})).not.toThrow();
  });
});
