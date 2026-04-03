const express = require('express');
const path = require('path');
const logger = require('./logger');
const VocaCheckError = require('./errors/VocaCheckError');
const { createProxy } = require('./routes/proxy');
const cardsRouter = require('./routes/cards');
const decksRouter = require('./routes/decks');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 8080;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const WHISPER_URL = process.env.WHISPER_URL || 'http://whisper:9000';

// ---------------------------------------------------------------------------
// 1. Proxy routes — mounted BEFORE body parsers so the raw request stream
//    can be piped directly to the upstream (required for Whisper multipart).
// ---------------------------------------------------------------------------

app.use('/api/ollama', createProxy(OLLAMA_URL));
app.use('/api/whisper', createProxy(WHISPER_URL));

// ---------------------------------------------------------------------------
// 2. Body parsing — only for routes below this point.
// ---------------------------------------------------------------------------

app.use(express.json());

// ---------------------------------------------------------------------------
// 3. Static frontend files.
// ---------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// 4. API routes.
// ---------------------------------------------------------------------------

app.use('/api/cards', cardsRouter);
app.use('/api/decks', decksRouter);
app.use('/api/admin', adminRouter);

// ---------------------------------------------------------------------------
// 5. Global error handler.
//    Receives errors passed via next(err) from any route above.
// ---------------------------------------------------------------------------

/**
 * Express global error-handling middleware.
 * Known VocaCheckError subclasses are logged and returned as structured JSON.
 * Unknown errors are logged and returned as a generic 500 response.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof VocaCheckError) {
    logger.error('Server', `${err.name}: ${err.message}`, err);
    return res.status(500).json({
      error: err.name,
      message: err.message,
      context: err.context,
    });
  }
  logger.error('Server', 'Unexpected error', err);
  res.status(500).json({ error: 'InternalServerError', message: 'An unexpected error occurred' });
});

// ---------------------------------------------------------------------------
// 6. Start.
// ---------------------------------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('Server', `VocaCheck listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

module.exports = app; // exported for Supertest in integration tests
