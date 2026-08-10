const logger = require('../utils/logger');

/**
 * Middleware central de errores (4 argumentos = Express lo reconoce como tal).
 * - Errores "operacionales" (AppError): se devuelve el mensaje, es seguro.
 * - Errores inesperados: se registra el detalle completo en el log del
 *   servidor pero al cliente SOLO se le da un mensaje genérico, para no
 *   filtrar rutas de archivos, queries SQL, ni stack traces.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (!err.isOperational) {
    logger.error('Error no controlado', { message: err.message, stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn('Error operacional', { message: err.message, path: req.originalUrl });
  }

  let payload;
  try {
    payload = JSON.parse(err.message);
  } catch {
    payload = err.message;
  }

  res.status(statusCode).json({
    error: err.isOperational ? payload : 'Ocurrió un error interno. Intenta nuevamente más tarde.',
  });
}

module.exports = { notFoundHandler, errorHandler };
