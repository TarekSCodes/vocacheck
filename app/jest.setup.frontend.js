// Polyfill TextEncoder/TextDecoder — jest-environment-jsdom does not expose
// Node's util globals, but AdminService uses TextDecoder for SSE decoding.
const { TextDecoder, TextEncoder } = require('node:util');
Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder, writable: true });
Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, writable: true });
