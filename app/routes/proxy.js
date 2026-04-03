const http = require('http');
const logger = require('../logger');

/**
 * Creates an Express middleware that proxies all incoming requests to the
 * specified upstream base URL.
 *
 * The mount-point prefix is automatically stripped by Express before the
 * middleware sees `req.url`, so the path forwarded to the upstream is already
 * the relative portion (e.g. mounting at '/api/ollama' and receiving
 * '/api/ollama/api/tags' means req.url === '/api/tags').
 *
 * The raw request body is piped directly to the upstream without buffering,
 * which is required for multipart/form-data payloads (Whisper audio upload).
 * To preserve this behaviour, proxy routes must be mounted in server.js
 * BEFORE the express.json() body-parser middleware.
 *
 * @param {string} upstreamBaseUrl - Full base URL of the upstream service,
 *   e.g. 'http://ollama:11434' or 'http://whisper:9000'.
 * @returns {import('express').RequestHandler}
 */
function createProxy(upstreamBaseUrl) {
  const upstream = new URL(upstreamBaseUrl);

  return (req, res, _next) => {
    const options = {
      hostname: upstream.hostname,
      port: upstream.port || 80,
      path: req.url,            // already stripped of the mount prefix by Express
      method: req.method,
      headers: {
        ...req.headers,
        host: upstream.host,   // override Host header to match upstream
      },
    };

    logger.debug('ProxyRoute', `${req.method} ${upstreamBaseUrl}${req.url}`);

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      logger.error('ProxyRoute', `Upstream request failed: ${upstreamBaseUrl}${req.url}`, err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', message: err.message });
      }
    });

    req.pipe(proxyReq, { end: true });
  };
}

module.exports = { createProxy };
