const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/**
 * POST /api/auth/login
 * Autenticación del panel de mesero/admin. Mensaje de error genérico
 * ("usuario o contraseña incorrectos") tanto si el usuario no existe como
 * si la contraseña es errónea, para no revelar qué usuarios existen
 * (evita enumeración de cuentas).
 */
const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, role, is_active, failed_attempts, locked_until FROM users WHERE username = ? LIMIT 1',
    [username],
  );
  const user = rows[0];

  const genericError = () => next(new AppError('Usuario o contraseña incorrectos.', 401));

  if (!user || !user.is_active) {
    return genericError();
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return next(new AppError('Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.', 423));
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    const attempts = user.failed_attempts + 1;
    const lockUntil = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60_000)
      : null;
    await pool.execute(
      'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockUntil, user.id],
    );
    return genericError();
  }

  await pool.execute(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL, ultimo_login = NOW() WHERE id = ?',
    [user.id],
  );

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
    expiresIn: env.jwt.expiresIn,
  });
});

/**
 * GET /api/auth/me — verifica sesión actual (usado por el frontend al recargar)
 */
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { login, me };
