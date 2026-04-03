/**
 * @file LoggerService.js
 * Centralised browser logging service.
 * In development (localhost) all messages are forwarded to the browser console.
 * In production all methods are silent no-ops so that end-users never see
 * internal diagnostic output.
 */

const isDev =
  typeof window !== 'undefined' && window.location.hostname === 'localhost';

/**
 * Formats a log prefix tag from the service name.
 *
 * @param {string} service - Calling service name (e.g. 'CardService').
 * @returns {string}
 */
function tag(service) {
  return `[${service}]`;
}

/**
 * Centralised logging service.
 * Use this instead of calling `console.*` directly so that production builds
 * stay silent without any code changes.
 */
export const LoggerService = {
  /**
   * Logs an informational message.
   *
   * @param {string} service - Name of the calling service.
   * @param {string} msg     - Log message.
   */
  info(service, msg) {
    if (isDev) console.info(tag(service), msg);
  },

  /**
   * Logs a warning message.
   *
   * @param {string} service - Name of the calling service.
   * @param {string} msg     - Log message.
   */
  warn(service, msg) {
    if (isDev) console.warn(tag(service), msg);
  },

  /**
   * Logs an error message with optional error object.
   *
   * @param {string} service  - Name of the calling service.
   * @param {string} msg      - Log message.
   * @param {Error}  [err]    - Optional error instance for stack trace.
   */
  error(service, msg, err) {
    if (isDev) console.error(tag(service), msg, err ?? '');
  },

  /**
   * Logs a debug message (verbose).
   *
   * @param {string} service - Name of the calling service.
   * @param {string} msg     - Log message.
   */
  debug(service, msg) {
    if (isDev) console.debug(tag(service), msg);
  },
};
