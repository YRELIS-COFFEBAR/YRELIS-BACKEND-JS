const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Exige un JWT válido en el header "Authorization: Bearer <token>".
 * Protege todas las rutas del panel de mesero/admin (cambios de estado,
 * cancelaciones, estadísticas, etc.).
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('No autenticado. Se requiere un token válido.', 401));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    return next(new AppError('Token inválido o expirado.', 401));
  }
}

/**
 * Restringe una ruta a uno o varios roles (ej: solo 'admin').
 * Usar DESPUÉS de authenticate.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('No tienes permisos para esta acción.', 403));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
