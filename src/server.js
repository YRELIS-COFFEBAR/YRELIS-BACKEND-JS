const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');
const initSocket = require('./sockets/socket');
const logger = require('./utils/logger');

async function start() {
  try {
    await testConnection();

    const server = http.createServer(app);
    const io = initSocket(server);
    app.set('io', io); // disponible en los controladores vía req.app.get('io')

    server.listen(env.port, () => {
      logger.info(`🚀 YRELIS backend escuchando en el puerto ${env.port} (${env.nodeEnv})`);
    });

    // Apagado ordenado: cierra conexiones antes de matar el proceso.
    const shutdown = (signal) => {
      logger.info(`Señal ${signal} recibida, cerrando servidor...`);
      server.close(() => {
        logger.info('Servidor cerrado correctamente.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Nunca dejar que un error no capturado tumbe el proceso en silencio.
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason });
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
      process.exit(1);
    });
  } catch (err) {
    logger.error('No se pudo iniciar el servidor', { message: err.message });
    process.exit(1);
  }
}

start();
