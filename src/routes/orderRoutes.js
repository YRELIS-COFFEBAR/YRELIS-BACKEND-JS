const express = require('express');
const ctrl = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  createOrderValidator,
  paymentValidator,
  orderIdParamValidator,
  paginationValidator,
  statusUpdateValidator,
  cancelOrderValidator,
  tableNumberValidator,
} = require('../validators/orderValidators');

const router = express.Router();

/* ---------- Rutas públicas (cliente en la tablet) ---------- */
router.post('/', createOrderValidator, validate, ctrl.createOrder);
router.post('/:orderNumber/payments', paymentValidator, validate, ctrl.processPayment);
router.post('/:orderNumber/payments/cancel', orderIdParamValidator, validate, ctrl.cancelPayment);

/* ---------- Rutas protegidas (panel de mesero, requieren JWT) ---------- */
router.use(authenticate);

router.get('/active', ctrl.listActiveOrders);
router.get('/stats/daily', ctrl.getDailyStats);
router.get('/table/:tableNumber', tableNumberValidator, validate, ctrl.getOrdersByTable);
router.get('/', paginationValidator, validate, ctrl.listOrders);
router.get('/:orderId', orderIdParamValidator, validate, ctrl.getOrderById);

router.patch('/:orderId/status', statusUpdateValidator, validate, ctrl.updateOrderStatus);
router.patch('/:orderId/start-preparing', orderIdParamValidator, validate, ctrl.startPreparingOrder);
router.patch('/:orderId/ready', orderIdParamValidator, validate, ctrl.markOrderReady);
router.patch('/:orderId/complete', orderIdParamValidator, validate, ctrl.completeOrder);
router.patch('/:orderId/cancel', cancelOrderValidator, validate, ctrl.cancelOrder);

module.exports = router;