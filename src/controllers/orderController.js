const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { buildOrderNumber } = require('../utils/orderNumber');

const ACTIVE_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'READY'];

function mapOrderRow(row) {
  return {
    id: row.id,
    orderNumber: row.id,
    customerName: row.customer_name,
    tableNumber: row.table_number,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.fecha_registro,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    updatedAt: row.fecha_actualizacion,
  };
}

/**
 * POST /api/orders
 * Crea el pedido DENTRO de una transacción
 */
const createOrder = asyncHandler(async (req, res, next) => {
  const { customerName, tableNumber, paymentMethod, items } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const productIds = [...new Set(items.map((i) => i.productId))];
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await connection.query(
      `SELECT id, name, price FROM products WHERE id IN (${placeholders}) AND is_active = 1 FOR UPDATE`,
      productIds,
    );
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const resolvedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new AppError(`Producto no disponible: ${item.productId}`, 400);
      }
      const unitPrice = Number(product.price) + (item.addonPrice ? Number(item.addonPrice) : 0);
      const lineSubtotal = Number((unitPrice * item.quantity).toFixed(2));
      subtotal += lineSubtotal;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: unitPrice,
        subtotal: lineSubtotal,
        addonName: item.addonName || null,
        addonPrice: item.addonPrice || null,
      };
    });

    const total = Number(subtotal.toFixed(2));

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (order_number, customer_name, table_number, payment_method, subtotal, total, status, payment_status, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', NOW())`,
      [
        `TEMP-${Date.now()}`,
        customerName,
        tableNumber ?? null,
        paymentMethod.toUpperCase(),
        subtotal,
        total,
      ],
    );
    const orderId = orderResult.insertId;
    const orderNumber = buildOrderNumber(orderId);
    await connection.execute('UPDATE orders SET order_number = ? WHERE id = ?', [orderNumber, orderId]);

    for (const item of resolvedItems) {
      await connection.execute(
        `INSERT INTO order_items
          (order_id, product_id, product_name, quantity, price, subtotal, addon_name, addon_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.productName, item.quantity, item.price, item.subtotal, item.addonName, item.addonPrice],
      );
    }

    await connection.commit();

    const [[orderRow]] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json(mapOrderRow(orderRow));
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
});

/**
 * POST /api/orders/:orderNumber/payments
 * Procesa el pago con simulación de Izipay
 */
const processPayment = asyncHandler(async (req, res, next) => {
  const orderId = req.params.orderNumber;
  const { paymentMethod } = req.body;

  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) {
    return next(new AppError('Pedido no encontrado.', 404));
  }
  if (order.payment_status === 'PAID') {
    return next(new AppError('Este pedido ya fue pagado.', 409));
  }

  const io = req.app.get('io');
  
  // Registrar el intento de pago como PENDING
  const transactionId = `TXN-${Date.now()}-${order.id}`;
  
  await pool.execute(
    `INSERT INTO payments (order_id, payment_method, status, transaction_id, amount, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order.id, paymentMethod.toUpperCase(), 'PENDING', transactionId, order.total, 'Esperando confirmación de pago'],
  );

  // Emitir evento de pago pendiente
  io?.emit('payment_pending', {
    orderId: order.id,
    transactionId,
    amount: Number(order.total),
    message: 'Pago en proceso'
  });

  // SIMULAR PROCESO DE PAGO (5 segundos)
  await new Promise(resolve => setTimeout(resolve, 5000));

  // SIMULAR RESULTADO (90% éxito)
  const isSuccess = Math.random() < 0.9;
  const status = isSuccess ? 'APPROVED' : 'REJECTED';
  const message = isSuccess ? 'Pago aprobado' : 'Pago rechazado por el banco';

  // Actualizar el pago
  await pool.execute(
    `UPDATE payments SET status = ?, message = ? WHERE transaction_id = ?`,
    [status, message, transactionId]
  );

  if (isSuccess) {
    await pool.execute(
      `UPDATE orders SET payment_status = 'PAID', status = 'PAID' WHERE id = ?`,
      [order.id],
    );
  } else {
    await pool.execute(
      `UPDATE orders SET payment_status = 'FAILED' WHERE id = ?`,
      [order.id],
    );
  }

  const [[updatedOrder]] = await pool.query('SELECT * FROM orders WHERE id = ?', [order.id]);
  
  // Emitir evento de confirmación de pago
  io?.emit('payment_confirmed', {
    orderId: updatedOrder.id,
    status: status,
    transactionId: transactionId,
    amount: Number(order.total),
    message: message
  });

  // Si fue exitoso, emitir nuevo pedido para el mesero
  if (isSuccess) {
    io?.emit('new_order', mapOrderRow(updatedOrder));
  }

  res.json({
    orderNumber: order.id,
    paymentMethod: paymentMethod.toUpperCase(),
    status,
    transactionId,
    amount: Number(order.total),
    message
  });
});

/**
 * POST /api/orders/:orderNumber/payments/cancel
 * Cancela un pago en proceso
 */
const cancelPayment = asyncHandler(async (req, res, next) => {
  const orderId = req.params.orderNumber;

  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) {
    return next(new AppError('Pedido no encontrado.', 404));
  }
  
  // Solo se puede cancelar si está en estado PENDING
  if (order.payment_status !== 'PENDING') {
    return next(new AppError('El pago ya no se puede cancelar.', 409));
  }

  // Cancelar el pago
  await pool.execute(
    `UPDATE payments SET status = 'CANCELLED', message = 'Cancelado por el usuario' 
     WHERE order_id = ? AND status = 'PENDING'`,
    [orderId]
  );

  await pool.execute(
    `UPDATE orders SET payment_status = 'CANCELLED' WHERE id = ?`,
    [orderId]
  );

  const io = req.app.get('io');
  io?.emit('payment_cancelled', {
    orderId: order.id,
    message: 'Pago cancelado por el usuario'
  });

  res.json({
    orderNumber: order.id,
    status: 'CANCELLED',
    message: 'Pago cancelado correctamente'
  });
});

/**
 * GET /api/orders
 * Lista todos los pedidos con paginación
 */
const listOrders = asyncHandler(async (req, res) => {
  const page = req.query.page ?? 0;
  const size = req.query.size ?? 10;
  const status = req.query.status;

  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT * FROM orders ${where} ORDER BY fecha_registro DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(size), parseInt(page) * parseInt(size)],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders ${where}`, params);

  res.json({
    content: rows.map(mapOrderRow),
    totalElements: total,
    totalPages: Math.ceil(total / size),
    size: parseInt(size),
    number: parseInt(page),
  });
});

/**
 * GET /api/orders/active
 * Lista pedidos activos
 */
const listActiveOrders = asyncHandler(async (req, res) => {
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE status IN (${placeholders}) ORDER BY fecha_registro ASC`,
    ACTIVE_STATUSES,
  );

  if (orders.length === 0) return res.json([]);

  const ids = orders.map((o) => o.id);
  const itemPlaceholders = ids.map(() => '?').join(',');
  const [items] = await pool.query(
    `SELECT * FROM order_items WHERE order_id IN (${itemPlaceholders})`,
    ids,
  );
  const itemsByOrder = new Map();
  for (const it of items) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push({
      productId: it.product_id,
      productName: it.product_name,
      quantity: it.quantity,
      price: Number(it.price),
      subtotal: Number(it.subtotal),
    });
  }

  res.json(
    orders.map((o) => ({
      ...mapOrderRow(o),
      orderNumber: o.order_number,
      items: itemsByOrder.get(o.id) || [],
    })),
  );
});

/**
 * GET /api/orders/:orderId
 * Obtiene un pedido por ID
 */
const getOrderById = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return next(new AppError('Pedido no encontrado.', 404));

  const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  res.json({
    ...mapOrderRow(order),
    orderNumber: order.order_number,
    items: items.map((it) => ({
      productId: it.product_id,
      productName: it.product_name,
      quantity: it.quantity,
      price: Number(it.price),
      subtotal: Number(it.subtotal),
    })),
  });
});

/**
 * GET /api/orders/table/:tableNumber
 * Obtiene pedidos por número de mesa
 */
const getOrdersByTable = asyncHandler(async (req, res) => {
  const { tableNumber } = req.params;
  const [rows] = await pool.query(
    'SELECT * FROM orders WHERE table_number = ? ORDER BY fecha_registro DESC',
    [tableNumber],
  );
  res.json(rows.map(mapOrderRow));
});

/**
 * GET /api/orders/stats/daily
 * Estadísticas del día
 */
const getDailyStats = asyncHandler(async (req, res) => {
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS totalPedidos,
       COALESCE(SUM(total), 0) AS totalVentas,
       SUM(CASE WHEN status IN ('PENDING','PAID') THEN 1 ELSE 0 END) AS pedidosPendientes,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS pedidosCompletados,
       COUNT(DISTINCT table_number) AS mesasActivas
     FROM orders
     WHERE DATE(fecha_registro) = CURDATE()`,
  );
  res.json({
    totalPedidos: row.totalPedidos || 0,
    totalVentas: Number(row.totalVentas) || 0,
    pedidosPendientes: row.pedidosPendientes || 0,
    pedidosCompletados: row.pedidosCompletados || 0,
    mesasActivas: row.mesasActivas || 0,
  });
});

/**
 * Helper para transiciones de estado
 */
async function transitionOrder(req, res, next, { newStatus, extraSql = '', extraParams = [] }) {
  const { orderId } = req.params;
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return next(new AppError('Pedido no encontrado.', 404));
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    return next(new AppError(`El pedido ya está en estado final (${order.status}).`, 409));
  }

  await pool.execute(
    `UPDATE orders SET status = ? ${extraSql} WHERE id = ?`,
    [newStatus, ...extraParams, orderId],
  );

  const [[updated]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  const io = req.app.get('io');
  io?.emit('order_updated', { orderId: updated.id, status: updated.status });

  res.json(mapOrderRow(updated));
}

const updateOrderStatus = asyncHandler((req, res, next) =>
  transitionOrder(req, res, next, { newStatus: req.body.status }));

const startPreparingOrder = asyncHandler((req, res, next) =>
  transitionOrder(req, res, next, {
    newStatus: 'PREPARING',
    extraSql: ', fecha_inicio = NOW()',
  }));

const markOrderReady = asyncHandler((req, res, next) =>
  transitionOrder(req, res, next, { newStatus: 'READY' }));

const completeOrder = asyncHandler((req, res, next) =>
  transitionOrder(req, res, next, {
    newStatus: 'COMPLETED',
    extraSql: ', fecha_fin = NOW()',
  }));

const cancelOrder = asyncHandler((req, res, next) =>
  transitionOrder(req, res, next, {
    newStatus: 'CANCELLED',
    extraSql: ', fecha_fin = NOW(), cancel_reason = ?',
    extraParams: [req.body.reason || null],
  }));

module.exports = {
  createOrder,
  processPayment,
  cancelPayment,
  listOrders,
  listActiveOrders,
  getOrderById,
  getOrdersByTable,
  getDailyStats,
  updateOrderStatus,
  startPreparingOrder,
  markOrderReady,
  completeOrder,
  cancelOrder,
};