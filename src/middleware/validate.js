const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Corta la petición con 400 si alguna regla de express-validator falló.
 * Toda entrada de usuario en este proyecto pasa por validadores explícitos
 * (whitelisting de tipos/formatos), nunca se confía en el body crudo.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new AppError(JSON.stringify(details), 400));
  }
  return next();
}

module.exports = validate;
