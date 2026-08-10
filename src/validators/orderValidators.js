const { body, param, query } = require('express-validator');

const STATUSES = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
const PAYMENT_METHODS = ['YAPE', 'PLIN', 'VISA'];

const createOrderValidator = [
  body('customerName')
    .trim()
    .notEmpty().withMessage('El nombre del cliente es requerido')
    .isLength({ max: 120 }).withMessage('Nombre demasiado largo')
    .escape(),
  body('tableNumber')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 999 }).withMessage('Número de mesa inválido')
    .toInt(),
  body('paymentMethod')
    .trim()
    .toUpperCase()
    .isIn(PAYMENT_METHODS).withMessage('Método de pago inválido'),
  body('items')
    .isArray({ min: 1 }).withMessage('El pedido debe tener al menos un producto'),
  body('items.*.productId')
    .trim()
    .notEmpty().withMessage('productId es requerido')
    .isLength({ max: 40 }).withMessage('productId inválido'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 }).withMessage('Cantidad inválida')
    .toInt(),
  body('items.*.addonName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Nombre de adicional inválido')
    .escape(),
  body('items.*.addonPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 10000 }).withMessage('Precio de adicional inválido')
    .toFloat(),
];

const paymentValidator = [
  param('orderNumber').isInt({ min: 1 }).withMessage('Pedido inválido').toInt(),
  body('paymentMethod')
    .trim()
    .toUpperCase()
    .isIn(PAYMENT_METHODS).withMessage('Método de pago inválido'),
];

const orderIdParamValidator = [
  param('orderId').isInt({ min: 1 }).withMessage('Id de pedido inválido').toInt(),
];

const paginationValidator = [
  query('page').optional().isInt({ min: 0, max: 100000 }).toInt(),
  query('size').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().trim().isIn(STATUSES).withMessage('Estado inválido'),
];

const statusUpdateValidator = [
  ...orderIdParamValidator,
  body('status').trim().isIn(STATUSES).withMessage('Estado inválido'),
];

const cancelOrderValidator = [
  ...orderIdParamValidator,
  body('reason')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Motivo demasiado largo')
    .escape(),
];

const tableNumberValidator = [
  param('tableNumber').isInt({ min: 1, max: 999 }).withMessage('Número de mesa inválido').toInt(),
];

module.exports = {
  STATUSES,
  PAYMENT_METHODS,
  createOrderValidator,
  paymentValidator,
  orderIdParamValidator,
  paginationValidator,
  statusUpdateValidator,
  cancelOrderValidator,
  tableNumberValidator,
};