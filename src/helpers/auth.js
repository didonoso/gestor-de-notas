
/**
 * Helpers de autenticación para rutas protegidas.
 * @module helpers/auth
 */
const helpers = {};

/**
 * Middleware que verifica si el usuario está autenticado.
 * Si no lo está, muestra un mensaje y redirige al formulario de ingreso.
 * @function isAuthenticated
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 */
helpers.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // Verifica si req.flash existe antes de usarlo
  if (typeof req.flash === 'function') {
    req.flash('error', 'Por favor, inicie sesión para acceder a esta página.');
  }
  return res.redirect('/usuarios/ingreso');
};

module.exports = helpers;