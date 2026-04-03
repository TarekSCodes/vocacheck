/**
 * @file SettingsService.js
 * Persists user settings to `localStorage`.
 * Provides typed getters and setters for every configurable value so that
 * the rest of the frontend never accesses `localStorage` directly.
 */

const KEYS = {
  OLLAMA_MODEL: 'vocacheck_ollama_model',
  WHISPER_MODEL: 'vocacheck_whisper_model',
};

const DEFAULTS = {
  OLLAMA_MODEL: 'llama3.1:8b',
  WHISPER_MODEL: 'small',
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
