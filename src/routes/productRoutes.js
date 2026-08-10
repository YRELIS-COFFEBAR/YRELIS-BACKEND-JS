const express = require('express');
const { 
  listCategories, 
  listProducts,
  listProductsByCategory,
  searchProducts,
  getProductById
} = require('../controllers/productController');

const router = express.Router();

// Rutas públicas (no requieren autenticación)
router.get('/products', listProducts);
router.get('/products/category/:categoryId', listProductsByCategory);
router.get('/products/search/:query', searchProducts);
router.get('/products/:id', getProductById);
router.get('/categories', listCategories);

module.exports = router;