'use strict';

const VocaCheckError = require('../../errors/VocaCheckError');
const WhisperConnectionError = require('../../errors/WhisperConnectionError');
const OllamaConnectionError = require('../../errors/OllamaConnectionError');
const OllamaModelNotFoundError = require('../../errors/OllamaModelNotFoundError');
const GpuNotAvailableError = require('../../errors/GpuNotAvailableError');
const CardStorageError = require('../../errors/CardStorageError');
const DeckStorageError = require('../../errors/DeckStorageError');
const InvalidResponseError = require('../../errors/InvalidResponseError');
const AdminCommandError = require('../../errors/AdminCommandError');

const ALL_SUBCLASSES = [
  WhisperConnectionError,
  OllamaConnectionError,
  OllamaModelNotFoundError,
  GpuNotAvailableError,
  CardStorageError,
  DeckStorageError,
  InvalidResponseError,
  AdminCommandError,
];

describe('Custom Exceptions', () => {
  test('WhisperConnectionError is instance of VocaCheckError', () => {
    const err = new WhisperConnectionError('test');
    expect(err).toBeInstanceOf(VocaCheckError);
  });

  test('OllamaConnectionError is instance of VocaCheckError', () => {
    const err = new OllamaConnectionError('test');
    expect(err).toBeInstanceOf(VocaCheckError);
  });

  test('every subclass is an instance of Error', () => {
    for (const Cls of ALL_SUBCLASSES) {
      expect(new Cls('test')).toBeInstanceOf(Error);
    }
  });

  test('error.name matches class name for every subclass', () => {
    for (const Cls of ALL_SUBCLASSES) {
      const err = new Cls('test message');
      expect(err.name).toBe(Cls.name);
    }
  });

  test('error.context is preserved', () => {
    const ctx = { url: 'http://example.com', code: 503 };
    const err = new WhisperConnectionError('connection failed', ctx);
    expect(err.context).toEqual(ctx);
  });

  test('error.context defaults to empty object when omitted', () => {
    const err = new OllamaConnectionError('no context');
    expect(err.context).toEqual({});
  });

  test('error.message is preserved', () => {
    const err = new CardStorageError('failed to write');
    expect(err.message).toBe('failed to write');
  });

  test('VocaCheckError itself sets name correctly', () => {
    const err = new VocaCheckError('base error');
    expect(err.name).toBe('VocaCheckError');
  });
});
