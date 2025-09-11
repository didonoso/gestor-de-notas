const { Router } = require('express');
const router = Router();

// Importamos las funciones del controlador
const { renderIndex, renderFaq } = require('../controllers/index.controller');
const { isAuthenticated } = require('../helpers/auth');

/**
 * Ruta principal del sitio web
 * @route GET /
 * @desc Renderiza la página principal del gestor de productos
 */
router.get('/', renderIndex);

/**
 * Ruta de Preguntas Frecuentes (FAQ)
 * @route GET /faq
 * @desc Renderiza la página de preguntas frecuentes
 */
router.get('/faq', isAuthenticated, renderFaq);

// Exportamos el router para que pueda ser usado en otros archivos
module.exports = router;
