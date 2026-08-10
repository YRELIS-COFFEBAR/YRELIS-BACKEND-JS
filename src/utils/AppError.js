/**
 * Error controlado con código HTTP explícito. Los controladores lanzan
 * esto para errores "esperados" (404, 400, 401, 403, 409...) y el
 * middleware de errores decide qué exponer al cliente.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
