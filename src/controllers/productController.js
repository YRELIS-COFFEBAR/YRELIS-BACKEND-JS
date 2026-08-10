const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * GET /api/categories
 * Devuelve todas las categorías con conteo de productos
 */
const listCategories = asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        c.id, 
        c.name, 
        c.image,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id, c.name, c.image
      ORDER BY c.name ASC`
    );
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error('Error en listCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
});

/**
 * GET /api/products
 * Devuelve todos los productos activos con su categoría
 */
const listProducts = asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.category_id, 
        p.image, 
        p.badge, 
        p.unit,
        p.addon_label,
        p.addon_price,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.category_id, p.name ASC`
    );

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category_id: p.category_id,
      category_name: p.category_name || '',
      image: p.image || 'assets/images/placeholder.png',
      badge: p.badge || undefined,
      unit: p.unit || undefined,
      addon_label: p.addon_label || undefined,
      addon_price: p.addon_price ? Number(p.addon_price) : undefined
    }));

    res.json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (error) {
    logger.error('Error en listProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

/**
 * GET /api/products/category/:categoryId
 * Devuelve productos de una categoría específica
 */
const listProductsByCategory = asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const [rows] = await pool.query(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.category_id, 
        p.image, 
        p.badge, 
        p.unit,
        p.addon_label,
        p.addon_price,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.is_active = 1
      ORDER BY p.name ASC`,
      [categoryId]
    );

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category_id: p.category_id,
      category_name: p.category_name || '',
      image: p.image || 'assets/images/placeholder.png',
      badge: p.badge || undefined,
      unit: p.unit || undefined,
      addon_label: p.addon_label || undefined,
      addon_price: p.addon_price ? Number(p.addon_price) : undefined
    }));

    res.json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (error) {
    logger.error('Error en listProductsByCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

/**
 * GET /api/products/search/:query
 * Busca productos por nombre o descripción
 */
const searchProducts = asyncHandler(async (req, res) => {
  try {
    const { query } = req.params;
    
    const [rows] = await pool.query(
      `SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.category_id, 
        p.image, 
        p.badge,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.name LIKE ? OR p.description LIKE ?) AND p.is_active = 1
      LIMIT 20`,
      [`%${query}%`, `%${query}%`]
    );

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category_id: p.category_id,
      category_name: p.category_name || '',
      image: p.image || 'assets/images/placeholder.png',
      badge: p.badge || undefined
    }));

    res.json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (error) {
    logger.error('Error en searchProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar productos',
      error: error.message
    });
  }
});

/**
 * GET /api/products/:id
 * Devuelve un producto específico
 */
const getProductById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(
      `SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const p = rows[0];
    const product = {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category_id: p.category_id,
      category_name: p.category_name || '',
      image: p.image || 'assets/images/placeholder.png',
      badge: p.badge || undefined,
      unit: p.unit || undefined,
      addon_label: p.addon_label || undefined,
      addon_price: p.addon_price ? Number(p.addon_price) : undefined,
      is_active: p.is_active
    };

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error en getProductById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
});

module.exports = { 
  listCategories, 
  listProducts,
  listProductsByCategory,
  searchProducts,
  getProductById
};