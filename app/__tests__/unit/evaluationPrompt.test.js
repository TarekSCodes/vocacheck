'use strict';

const { buildPrompt, parseResponse } = require('../../services/EvaluationService');
const InvalidResponseError = require('../../errors/InvalidResponseError');

describe('buildPrompt', () => {
  test('includes question, modelAnswer, userAnswer in prompt', () => {
    const prompt = buildPrompt('What is OOP?', 'Object-oriented programming', 'OOP is a paradigm');
    expect(prompt).toContain('What is OOP?');
    expect(prompt).toContain('Object-oriented programming');
    expect(prompt).toContain('OOP is a paradigm');
  });

  test('does not include any other card fields', () => {
    const prompt = buildPrompt('Q', 'A', 'U');
    expect(prompt).not.toContain('deckId');
    expect(prompt).not.toContain('level');
    expect(prompt).not.toContain('correctStreak');
    expect(prompt).not.toContain('lastReviewed');
    expect(prompt).not.toContain('createdAt');
    expect(prompt).not.toContain('updatedAt');
  });
});

describe('parseResponse', () => {
  test('valid JSON { correct: true } parsed correctly', () => {
    const result = parseResponse('{"correct": true, "feedback": "Great answer!"}');
    expect(result.correct).toBe(true);
    expect(result.feedback).toBe('Great answer!');
  });

  test('valid JSON { correct: false } parsed correctly', () => {
    const result = parseResponse('{"correct": false, "feedback": "Not quite right."}');
    expect(result.correct).toBe(false);
    expect(result.feedback).toBe('Not quite right.');
  });

  test('invalid JSON throws InvalidResponseError', () => {
    expect(() => parseResponse('not json at all')).toThrow(InvalidResponseError);
  });

  test('JSON missing correct field throws InvalidResponseError', () => {
    expect(() => parseResponse('{"feedback": "ok"}')).toThrow(InvalidResponseError);
  });

  test('JSON missing feedback field throws InvalidResponseError', () => {
    expect(() => parseResponse('{"correct": true}')).toThrow(InvalidResponseError);
  });

  test('correct field as non-boolean throws InvalidResponseError', () => {
    expect(() => parseResponse('{"correct": "yes", "feedback": "ok"}')).toThrow(InvalidResponseError);
  });
});
