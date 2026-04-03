const winston = require('winston');
require('winston-daily-rotate-file');

const LOG_DIR = process.env.LOG_PATH || '/app/logs';
const isDev = process.env.NODE_ENV !== 'production';

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) =>
    `[${timestamp}] [${level.toUpperCase()}] ${message}`
  )
);

const transports = isDev
  ? [new winston.transports.Console({ format: customFormat })]
  : [
      new winston.transports.DailyRotateFile({
        dirname: LOG_DIR,
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '7d',
        format: customFormat,
      }),
    ];

const winstonLogger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  transports,
});

/**
 * Centralised logger for the VocaCheck backend.
 *
 * Output format: `[YYYY-MM-DD HH:mm:ss] [LEVEL] [ServiceName] Message`
 *
 * **Development** (`NODE_ENV !== 'production'`): writes to the console.
 * **Production** (`NODE_ENV === 'production'`): writes to a daily-rotating log
 * file inside `LOG_PATH` (default `/app/logs`). Files older than 7 days are
 * deleted automatically. No console output in production.
 *
 * @example
 * const logger = require('./LoggerService');
 * logger.info('CardRoute', 'Card created successfully');
 * logger.error('DeckStorage', 'Failed to write decks.json', err);
 */
const LoggerService = {
  /**
   * Log an informational message.
   * Use for normal application flow: card saved, session started, server listening.
   *
   * @param {string} service - Name of the calling service or route (e.g. `'CardRoute'`).
   * @param {string} msg     - Message to log.
   */
  info(service, msg) {
    winstonLogger.info(`[${service}] ${msg}`);
  },

  /**
   * Log a warning.
   * Use for handleable problems that did not stop the operation
   * (e.g. parse failed and retry started, GPU not detected).
   *
   * @param {string} service - Name of the calling service or route.
   * @param {string} msg     - Message to log.
   */
  warn(service, msg) {
    winstonLogger.warn(`[${service}] ${msg}`);
  },

  /**
   * Log an error.
   * Use when an unexpected error prevents a function from completing.
   * The optional `err` argument's message is appended after a dash.
   *
   * @param {string} service  - Name of the calling service or route.
   * @param {string} msg      - Message to log.
   * @param {Error}  [err]    - Optional error object whose message is appended.
   */
  error(service, msg, err) {
    const suffix = err ? ` — ${err.message || String(err)}` : '';
    winstonLogger.error(`[${service}] ${msg}${suffix}`);
  },

  /**
   * Log a debug-level message.
   * Only emitted when `NODE_ENV !== 'production'`.
   * Use for developer details: request bodies, response payloads, timing.
   *
   * @param {string} service - Name of the calling service or route.
   * @param {string} msg     - Message to log.
   */
  debug(service, msg) {
    winstonLogger.debug(`[${service}] ${msg}`);
  },
};

module.exports = LoggerService;
