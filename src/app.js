const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Confía en el primer proxy (necesario si va detrás de Nginx/load balancer
// para que express-rate-limit e IPs de log sean correctas).
app.set('trust proxy', 1);

/* ============== CABECERAS DE SEGURIDAD ============== */
// Helmet con configuración más permisiva para desarrollo
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false, // Desactivar CSP para desarrollo
}));

/* ============== CORS RESTRINGIDO A ORÍGENES CONOCIDOS ============== */
app.use(
  cors({
    origin(origin, callback) {
      // Permite herramientas sin origin (curl/Postman) solo en desarrollo.
      if (!origin && env.nodeEnv !== 'production') return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }),
);

/* ============== PARSEO Y SANEAMIENTO DEL BODY ============== */
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
// ❌ ELIMINADO: app.use(mongoSanitize()); - No necesario para MySQL
app.use(hpp());
app.use(compression());

/* ============== LOGGING DE ACCESO ============== */
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

/* ============== RATE LIMITING GLOBAL ============== */
app.use('/api', apiLimiter);

/* ============== RUTAS ============== */
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api/orders', orderRoutes);

/* ============== 404 Y ERRORES ============== */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;