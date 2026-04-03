const express = require('express');
const http = require('http');
const router = express.Router();
const logger = require('../logger');
const OllamaConnectionError = require('../errors/OllamaConnectionError');
const GpuNotAvailableError = require('../errors/GpuNotAvailableError');
const AdminCommandError = require('../errors/AdminCommandError');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Makes an HTTP GET request and resolves with the parsed JSON body.
 *
 * @param {string} baseUrl - Base URL (e.g. 'http://ollama:11434').
 * @param {string} path    - Request path (e.g. '/api/tags').
 * @returns {Promise<Object>}
 * @throws {OllamaConnectionError} When the request fails or times out.
 */
function ollamaGet(baseUrl, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      { hostname: url.hostname, port: url.port || 11434, path: url.pathname, method: 'GET' },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({}); }
        });
      }
    );
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new OllamaConnectionError('Ollama request timed out', { url: baseUrl + path }));
    });
    req.on('error', (err) =>
      reject(new OllamaConnectionError('Ollama unreachable', { url: baseUrl + path, cause: err.message }))
    );
    req.end();
  });
}

/**
 * Makes an HTTP request to the Docker daemon via the Unix socket.
 *
 * @param {string} path       - Docker API path (e.g. '/containers/json').
 * @param {string} [method]   - HTTP method (default: 'GET').
 * @param {Object} [body]     - Optional JSON request body.
 * @returns {Promise<Object|Array>}
 * @throws {AdminCommandError} When the Docker socket is unreachable.
 */
function dockerRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      socketPath: '/var/run/docker.sock',
      path,
      method,
      headers: payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {},
    };
    const req = http.request(options, /* istanbul ignore next */ (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', (err) =>
      reject(new AdminCommandError('Docker socket unreachable', { path, cause: err.message }))
    );
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Finds a Docker container by its Compose service name.
 * Uses label com.docker.compose.service so it works regardless of project name.
 *
 * @param {string} serviceName - Compose service name (e.g. 'whisper').
 * @returns {Promise<Object|null>} Container object or null if not found.
 */
/* istanbul ignore next */
async function findContainerByService(serviceName) {
  const filters = encodeURIComponent(
    JSON.stringify({ label: [`com.docker.compose.service=${serviceName}`] })
  );
  const containers = await dockerRequest(`/containers/json?filters=${filters}&all=true`);
  return Array.isArray(containers) && containers.length > 0 ? containers[0] : null;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/status
 *
 * First-run check. Verifies whether Ollama is reachable and whether at least
 * one model is installed. The frontend shows the setup assistant when
 * modelInstalled is false.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.get('/status', async (req, res, next) => {
  try {
    const data = await ollamaGet(OLLAMA_URL, '/api/tags');
    const models = data.models || [];
    logger.debug('AdminRoute', `Status check — ${models.length} model(s) installed`);
    res.json({
      ollamaReachable: true,
      modelInstalled: models.length > 0,
      models: models.map((m) => m.name),
    });
  } catch (err) {
    if (err instanceof OllamaConnectionError) {
      logger.warn('AdminRoute', 'Ollama unreachable during status check');
      return res.json({ ollamaReachable: false, modelInstalled: false, models: [] });
    }
    next(err);
  }
});

/**
 * GET /api/admin/gpu-status
 *
 * Inspects the Ollama Docker container via the Docker socket to determine
 * whether GPU device requests are configured (indicating the NVIDIA Container
 * Toolkit is installed and GPU access is enabled).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.get('/gpu-status', async (req, res, next) => {
  try {
    const container = await findContainerByService('ollama');
    if (!container) {
      logger.warn('AdminRoute', 'Ollama container not found during GPU check');
      throw new GpuNotAvailableError('Ollama container not found');
    }
    /* istanbul ignore next */
    const inspect = await dockerRequest(`/containers/${container.Id}/json`);
    /* istanbul ignore next */
    const deviceRequests = inspect?.HostConfig?.DeviceRequests || [];
    /* istanbul ignore next */
    const gpuAvailable = deviceRequests.some((dr) =>
      Array.isArray(dr.Capabilities) &&
      dr.Capabilities.some((cap) => cap.includes('gpu'))
    );
    /* istanbul ignore next */
    logger.debug('AdminRoute', `GPU status: ${gpuAvailable ? 'available' : 'not available'}`);
    /* istanbul ignore next */
    res.json({ gpuAvailable });
  } catch (err) {
    if (err instanceof GpuNotAvailableError) {
      return res.json({ gpuAvailable: false });
    }
    next(err);
  }
});

/**
 * POST /api/admin/restart-whisper
 *
 * Restarts the Whisper Docker container via the Docker socket.
 * Required after the user changes the Whisper model in settings.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.post('/restart-whisper', async (req, res, next) => {
  try {
    const container = await findContainerByService('whisper');
    if (!container) {
      throw new AdminCommandError('Whisper container not found — is it running?');
    }
    /* istanbul ignore next */
    await dockerRequest(`/containers/${container.Id}/restart`, 'POST');
    /* istanbul ignore next */
    logger.info('AdminRoute', `Whisper container restarted: ${container.Id}`);
    /* istanbul ignore next */
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/pull-model
 *
 * Triggers an Ollama model pull and streams progress back to the client
 * via Server-Sent Events (SSE). Each event is a JSON object from Ollama's
 * streaming pull API.
 *
 * The stream ends with a synthetic `{"status":"complete"}` event.
 *
 * @param {import('express').Request} req - Body: { model: string }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.post('/pull-model', async (req, res, _next) => {
  const { model } = req.body || {};
  if (!model) return res.status(400).json({ error: 'model is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logger.info('AdminRoute', `Starting model pull: ${model}`);

  const ollamaUrl = new URL(OLLAMA_URL);
  const payload = JSON.stringify({ model, stream: true });

  const pullReq = http.request(
    {
      hostname: ollamaUrl.hostname,
      port: ollamaUrl.port || 11434,
      path: '/api/pull',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (pullRes) => {
      pullRes.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter((l) => l.trim());
        for (const line of lines) {
          res.write(`data: ${line}\n\n`);
        }
      });
      pullRes.on('end', () => {
        logger.info('AdminRoute', `Model pull complete: ${model}`);
        res.write('data: {"status":"complete"}\n\n');
        res.end();
      });
    }
  );

  pullReq.on('error', (err) => {
    logger.error('AdminRoute', `Model pull failed: ${model}`, err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });

  pullReq.write(payload);
  pullReq.end();
});

module.exports = router;
