const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Inicializa Socket.io reutilizando la MISMA whitelist de CORS que la API
 * REST, y exige un JWT válido para conectarse — así un desconocido no
 * puede escuchar en tiempo real los pedidos de otros clientes.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('No autenticado'));
    }
    try {
      const payload = jwt.verify(token, env.jwt.secret);
      socket.data.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket conectado: ${socket.id} (usuario ${socket.data.user?.id})`);

    socket.on('order_ready', (data) => {
      socket.broadcast.emit('order_updated', { orderId: data?.orderId, status: 'READY' });
    });

    socket.on('order_completed', (data) => {
      socket.broadcast.emit('order_updated', { orderId: data?.orderId, status: 'COMPLETED' });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket desconectado: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
