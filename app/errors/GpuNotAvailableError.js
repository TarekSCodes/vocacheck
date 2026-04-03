const VocaCheckError = require('./VocaCheckError');

/**
 * Thrown when no Nvidia GPU is detected in the Ollama container.
 * Typically means the NVIDIA Container Toolkit is not installed or Docker Desktop
 * was not restarted after installation.
 *
 * @example
 * throw new GpuNotAvailableError('GPU not detected', { gpuInfo: rawResponse });
 */
class GpuNotAvailableError extends VocaCheckError {}

module.exports = GpuNotAvailableError;
