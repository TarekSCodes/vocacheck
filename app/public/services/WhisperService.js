/**
 * @file WhisperService.js
 * Records microphone audio via the MediaRecorder API and transcribes it using
 * the local Whisper ASR container (proxied at `/api/whisper/*`).
 *
 * Usage flow:
 * 1. `await WhisperService.startRecording()`  — requests mic, starts recording
 * 2. `const blob = await WhisperService.stopRecording()` — stops, returns Blob
 * 3. `const text = await WhisperService.transcribe(blob)` — posts to Whisper
 *
 * Steps 2 and 3 can be merged by calling `transcribe` with the Blob returned
 * by `stopRecording`.
 */

import { WhisperConnectionError } from './errors.js';
import { LoggerService } from './LoggerService.js';

const TRANSCRIBE_URL = '/api/whisper/asr?output=json';

let _recorder = null;
let _chunks = [];
let _stopResolve = null;

/**
 * Requests microphone permission and starts recording audio.
 * Accumulates PCM chunks in memory until `stopRecording()` is called.
 *
 * @returns {Promise<void>}
 * @throws {WhisperConnectionError} When microphone access is denied or unavailable.
 */
export async function startRecording() {
  if (_recorder && _recorder.state === 'recording') {
    LoggerService.warn('WhisperService', 'startRecording called while already recording — ignored');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    throw new WhisperConnectionError('Microphone access denied or unavailable', {
      cause: err.message,
    });
  }

  _chunks = [];
  _recorder = new MediaRecorder(stream);

  _recorder.ondataavailable = (e) => {
    if (e.data.size > 0) _chunks.push(e.data);
  };

  _recorder.onstop = () => {
    const blob = new Blob(_chunks, { type: _recorder.mimeType || 'audio/webm' });
    stream.getTracks().forEach((t) => t.stop());
    if (_stopResolve) {
      _stopResolve(blob);
      _stopResolve = null;
    }
  };

  _recorder.start();
  LoggerService.debug('WhisperService', 'Recording started');
}

/**
 * Stops the active recording and resolves with the captured audio Blob.
 * Returns `{ success: false, reason }` when no recording is in progress.
 *
 * @returns {Promise<Blob|{ success: false, reason: string }>}
 */
export function stopRecording() {
  if (!_recorder || _recorder.state !== 'recording') {
    LoggerService.warn('WhisperService', 'stopRecording called but no active recording');
    return Promise.resolve({ success: false, reason: 'No active recording' });
  }

  return new Promise((resolve) => {
    _stopResolve = resolve;
    _recorder.stop();
    LoggerService.debug('WhisperService', 'Recording stopped');
  });
}

/**
 * Sends an audio Blob to the local Whisper container and returns the transcript.
 *
 * The Whisper ASR webservice (`onerahmet/openai-whisper-asr-webservice`) expects
 * a `multipart/form-data` POST with a field named `audio_file`.
 *
 * @param {Blob} audioBlob - Recorded audio blob (any format MediaRecorder produces).
 * @returns {Promise<string>} Transcribed text.
 * @throws {WhisperConnectionError} When the network request fails or the service
 *   returns a non-2xx status.
 */
export async function transcribe(audioBlob) {
  LoggerService.debug('WhisperService', `transcribe — blob size: ${audioBlob.size} bytes`);

  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'recording.webm');

  let res;
  try {
    res = await fetch(TRANSCRIBE_URL, { method: 'POST', body: formData });
  } catch (err) {
    throw new WhisperConnectionError('Whisper request failed', {
      url: TRANSCRIBE_URL,
      cause: err.message,
    });
  }

  if (!res.ok) {
    throw new WhisperConnectionError(`Whisper returned HTTP ${res.status}`, {
      url: TRANSCRIBE_URL,
      status: res.status,
    });
  }

  const data = await res.json();
  LoggerService.debug('WhisperService', `transcribe — result: "${data.text}"`);
  return data.text ?? '';
}

/**
 * Convenience object export so callers can do:
 * `import { WhisperService } from './WhisperService.js'`
 */
export const WhisperService = { startRecording, stopRecording, transcribe };
