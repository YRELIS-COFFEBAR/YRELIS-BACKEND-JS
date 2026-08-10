require('dotenv').config();

/**
 * Falla rápido (fail-fast) si falta una variable de entorno crítica.
 * Esto evita arrancar el servidor con configuración insegura por defecto
 * (por ejemplo, un JWT_SECRET vacío).
 */
function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 8080,

  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    loginMax: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  },
};

if (env.nodeEnv === 'production' && env.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET es demasiado corto para producción (usa al menos 32 caracteres aleatorios).');
}

if (env.corsOrigins.length === 0) {
  console.warn('⚠️  CORS_ORIGINS no está definido: por defecto se bloquearán todos los orígenes cruzados.');
}

module.exports = env;
