/**
 * Crea (o actualiza) el usuario admin inicial usando bcrypt.
 * Ejecutar UNA sola vez después de correr schema.sql:
 *   node database/init.js
 *
 * Lee SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD desde .env — nunca
 * hardcodear credenciales en el código.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password || password.length < 8) {
    console.error('Define SEED_ADMIN_USERNAME y SEED_ADMIN_PASSWORD (min. 8 caracteres) en tu .env');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const passwordHash = await bcrypt.hash(password, 12);

  await connection.execute(
    `INSERT INTO users (username, password_hash, full_name, role, is_active)
     VALUES (?, ?, 'Administrador', 'admin', 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username, passwordHash],
  );

  console.log(`Usuario admin "${username}" creado/actualizado correctamente.`);
  await connection.end();
}

main().catch((err) => {
  console.error('Error inicializando el usuario admin:', err.message);
  process.exit(1);
});
