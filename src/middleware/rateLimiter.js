const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Limitador general para toda la API — mitiga escaneo/DoS básico.
 */
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' },
});

/**
 * Limitador estricto solo para el login — mitiga fuerza bruta de
 * contraseñas independientemente del límite general de la API.
 */
const loginLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera unos minutos.' },
});

module.exports = { apiLimiter, loginLimiter };
