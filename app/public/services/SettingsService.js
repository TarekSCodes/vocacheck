/**
 * @file SettingsService.js
 * Persists user settings to `localStorage`.
 * Provides typed getters and setters for every configurable value so that
 * the rest of the frontend never accesses `localStorage` directly.
 */

const KEYS = {
  OLLAMA_MODEL:     'vocacheck_ollama_model',
  WHISPER_MODEL:    'vocacheck_whisper_model',
  SYSTEM_PROMPT:    'vocacheck_system_prompt',
  SUMMARY_PROMPT:   'vocacheck_summary_prompt',
  KEYBOARD_SCHEME:  'vocacheck_keyboard_scheme',
};

const DEFAULTS = {
  OLLAMA_MODEL:    'llama3.1:8b',
  WHISPER_MODEL:   'small',
  KEYBOARD_SCHEME: 'space-enter',
};

/**
 * Settings service — read/write model selections from localStorage.
 */
export const SettingsService = {
  /**
   * Returns the currently selected Ollama model name.
   * Falls back to `'llama3.1:8b'` if no value is stored yet.
   *
   * @returns {string} Ollama model name (e.g. `'llama3.1:8b'`).
   */
  getOllamaModel() {
    return localStorage.getItem(KEYS.OLLAMA_MODEL) ?? DEFAULTS.OLLAMA_MODEL;
  },

  /**
   * Persists the selected Ollama model name.
   *
   * @param {string} model - Ollama model name (e.g. `'llama3.1:8b'`).
   */
  setOllamaModel(model) {
    localStorage.setItem(KEYS.OLLAMA_MODEL, model);
  },

  /**
   * Returns the currently selected Whisper model size.
   * Falls back to `'small'` if no value is stored yet.
   *
   * @returns {string} Whisper model size (e.g. `'small'`, `'medium'`, `'large'`).
   */
  getWhisperModel() {
    return localStorage.getItem(KEYS.WHISPER_MODEL) ?? DEFAULTS.WHISPER_MODEL;
  },

  /**
   * Persists the selected Whisper model size.
   *
   * @param {string} model - Whisper model size.
   */
  setWhisperModel(model) {
    localStorage.setItem(KEYS.WHISPER_MODEL, model);
  },

  /**
   * Returns the custom system prompt stored by the user, or `null` if none is set.
   * Callers should fall back to `DEFAULT_SYSTEM_PROMPT` from EvaluationService.
   *
   * @returns {string|null}
   */
  getSystemPrompt() {
    return localStorage.getItem(KEYS.SYSTEM_PROMPT);
  },

  /**
   * Persists a custom system prompt.
   *
   * @param {string} prompt
   */
  setSystemPrompt(prompt) {
    localStorage.setItem(KEYS.SYSTEM_PROMPT, prompt);
  },

  /**
   * Removes the custom system prompt so EvaluationService falls back to the default.
   */
  resetSystemPrompt() {
    localStorage.removeItem(KEYS.SYSTEM_PROMPT);
  },

  /**
   * Returns the custom summary prompt stored by the user, or `null` if none is set.
   * Callers should fall back to `DEFAULT_SUMMARY_PROMPT` from EvaluationService.
   *
   * @returns {string|null}
   */
  getSummaryPrompt() {
    return localStorage.getItem(KEYS.SUMMARY_PROMPT);
  },

  /**
   * Persists a custom summary prompt.
   *
   * @param {string} prompt
   */
  setSummaryPrompt(prompt) {
    localStorage.setItem(KEYS.SUMMARY_PROMPT, prompt);
  },

  /**
   * Removes the custom summary prompt so EvaluationService falls back to the default.
   */
  resetSummaryPrompt() {
    localStorage.removeItem(KEYS.SUMMARY_PROMPT);
  },

  /**
   * Returns the keyboard shortcut scheme (`'space-enter'` or `'arrows'`).
   * Falls back to `'space-enter'` if nothing is stored yet.
   *
   * @returns {string}
   */
  getKeyboardScheme() {
    return localStorage.getItem(KEYS.KEYBOARD_SCHEME) ?? DEFAULTS.KEYBOARD_SCHEME;
  },

  /**
   * Persists the keyboard shortcut scheme.
   *
   * @param {'space-enter'|'arrows'} scheme
   */
  setKeyboardScheme(scheme) {
    localStorage.setItem(KEYS.KEYBOARD_SCHEME, scheme);
  },

  /**
   * Returns all settings as a plain object.
   *
   * @returns {{ ollamaModel: string, whisperModel: string }}
   */
  getAll() {
    return {
      ollamaModel: this.getOllamaModel(),
      whisperModel: this.getWhisperModel(),
    };
  },

  /**
   * Bulk-updates all settings from a plain object.
   * Only updates a key when the corresponding value is a non-empty string.
   *
   * @param {{ ollamaModel?: string, whisperModel?: string }} settings
   */
  setAll({ ollamaModel, whisperModel } = {}) {
    if (typeof ollamaModel === 'string' && ollamaModel) {
      this.setOllamaModel(ollamaModel);
    }
    if (typeof whisperModel === 'string' && whisperModel) {
      this.setWhisperModel(whisperModel);
    }
  },
};
