/**
 * Envuelve controladores async para que cualquier excepción caiga en
 * el middleware central de errores en vez de colgar el proceso o
 * filtrar un stack trace directo al cliente.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
