const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit || 10,
  queueLimit: 0,
  dateStrings: false,
  namedPlaceholders: false,
  decimalNumbers: true,
});

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    logger.info('Conexión a MySQL establecida correctamente.');
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection };