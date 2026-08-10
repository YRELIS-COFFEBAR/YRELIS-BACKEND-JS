/**
 * Genera un código de pedido legible tipo ORD-2026-000123.
 * No se usa como identificador de seguridad (eso lo hace el id numérico
 * interno + los checks de propiedad), solo como referencia para el cliente.
 */
function buildOrderNumber(id, date = new Date()) {
  const year = date.getFullYear();
  const padded = String(id).padStart(6, '0');
  return `ORD-${year}-${padded}`;
}

module.exports = { buildOrderNumber };
