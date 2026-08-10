const { body } = require('express-validator');

const loginValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ max: 60 }).withMessage('Usuario demasiado largo')
    .escape(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8, max: 128 }).withMessage('Contraseña inválida'),
];

module.exports = { loginValidator };
