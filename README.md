# YRELIS Backend

API REST + WebSocket en **Node.js / Express (JavaScript puro, sin TypeScript)**
con **MySQL** (diseñado para MySQL Workbench), para el frontend Angular de
YRELIS (menú del cliente + panel de mesero).

## 1. Requisitos

- Node.js 18+
- MySQL 8+ (Workbench para administrarlo visualmente)

## 2. Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` y coloca:
- Credenciales reales de tu base de datos (`DB_USER`, `DB_PASSWORD`, nunca `root` en producción).
- Un `JWT_SECRET` propio y aleatorio:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Los orígenes permitidos en `CORS_ORIGINS` (la URL real de tu Angular).

## 3. Base de datos (MySQL Workbench)

1. Abre `database/schema.sql` en Workbench y ejecútalo completo (crea la BD,
   el usuario de aplicación con privilegios mínimos, y todas las tablas).
2. (Opcional, solo desarrollo) ejecuta `database/seed.sql` para datos de prueba.
3. Crea el usuario admin del panel (contraseña con hash bcrypt, nunca en texto plano):
   ```bash
   npm run db:init
   ```

## 4. Ejecutar

```bash
npm run dev     # con recarga automática (nodemon)
npm start       # producción
```

El servidor expone `http://localhost:8080` y valida la conexión a MySQL al
arrancar; si la base de datos no responde, el proceso no inicia (fail-fast).

## 5. Endpoints principales

**Públicos** (usados por el cliente en la tablet):
- `GET  /api/products`
- `GET  /api/categories`
- `POST /api/orders`
- `POST /api/orders/:orderNumber/payments`

**Protegidos con JWT** (panel de mesero — header `Authorization: Bearer <token>`):
- `POST /api/auth/login`
- `GET  /api/orders`, `/api/orders/active`, `/api/orders/:orderId`, `/api/orders/table/:tableNumber`
- `GET  /api/orders/stats/daily`
- `PATCH /api/orders/:orderId/status|start-preparing|ready|complete|cancel`

El WebSocket (Socket.io) también exige el mismo JWT en el handshake
(`socket = io(URL, { auth: { token } })`) para recibir `new_order` / `order_updated`.

## 6. Checklist de seguridad ya implementado

| Riesgo | Mitigación |
|---|---|
| Inyección SQL | 100% sentencias preparadas con `mysql2` (placeholders `?`), nunca concatenación de strings |
| XSS / payloads maliciosos | `express-validator` con whitelisting estricto + `.escape()`, `express-mongo-sanitize`, `helmet` |
| Fuerza bruta en login | `express-rate-limit` dedicado al login + bloqueo de cuenta tras 5 intentos fallidos |
| DoS básico / payloads gigantes | Rate limiting global + `express.json({ limit: '100kb' })` |
| CSRF / origen cruzado no autorizado | `cors` con whitelist explícita de orígenes (no `*`) |
| Manipulación de precios desde el navegador | El backend **recalcula precio y subtotal en el servidor** a partir de la BD, ignorando cualquier precio enviado por el cliente |
| Contraseñas | `bcryptjs` con 12 rounds, nunca texto plano ni en logs |
| Sesión / autorización | JWT firmado con expiración + roles (`admin`/`mesero`) vía middleware `authorize()` |
| Fuga de detalles internos | Middleware central de errores: errores inesperados solo devuelven un mensaje genérico al cliente; el detalle completo va al log del servidor |
| HTTP Parameter Pollution | `hpp` |
| Cabeceras HTTP inseguras | `helmet` (incluye HSTS) |
| Menor privilegio en BD | El usuario de aplicación (`yrelis_app`) solo tiene `SELECT/INSERT/UPDATE/DELETE`, nunca `DROP`/`GRANT`/acceso a otras BDs |
| Trazabilidad | Tabla `audit_log` + `winston` (logs a archivo y consola) |
| Apagado inseguro | `SIGTERM`/`SIGINT` cierran conexiones antes de matar el proceso; excepciones no capturadas no dejan el proceso en estado inconsistente |

### Recomendaciones adicionales para producción (fuera del código)
- Servir siempre detrás de **HTTPS** (certificado TLS, ej. vía Nginx/Caddy o el balanceador de tu proveedor cloud).
- Restringir el acceso a MySQL por firewall/Security Group (solo desde el servidor de la app, nunca `0.0.0.0/0`).
- Rotar `JWT_SECRET` y credenciales de BD periódicamente.
- Hacer backups automáticos de la base de datos.
- Mantener `npm audit` limpio y dependencias actualizadas.

## 7. Estructura del proyecto

```
yrelis-backend/
├── database/
│   ├── schema.sql      # DDL completo para MySQL Workbench
│   ├── seed.sql         # datos de ejemplo (opcional)
│   └── init.js           # crea el admin con password hasheado
├── src/
│   ├── config/           # env.js (variables validadas), db.js (pool MySQL)
│   ├── controllers/       # lógica de negocio
│   ├── middleware/        # auth (JWT), rate limiting, validación, errores
│   ├── routes/             # definición de endpoints
│   ├── sockets/             # Socket.io autenticado
│   ├── utils/                # logger, AppError, asyncHandler, orderNumber
│   ├── validators/            # reglas de express-validator
│   ├── app.js                  # configuración de Express + seguridad
│   └── server.js                # arranque del proceso
├── .env.example
├── package.json
└── README.md
```
