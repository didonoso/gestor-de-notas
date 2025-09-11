// Controlador para las rutas principales de la página (índice y FAQ)
const indexController = {};

/**
 * Renderiza la página principal (índice).
 * Esta función se encarga de procesar la solicitud para la página principal de la aplicación.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
indexController.renderIndex = (req, res) => {
    res.render('index');
};

/**
 * Renderiza la página de Preguntas Frecuentes (FAQ).
 * Esta función se encarga de procesar la solicitud para la página de preguntas frecuentes.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
/**
 * Renderiza la página de Preguntas Frecuentes (FAQ) con mejora de seguridad.
 * Verifica la cabecera Referer para mitigar accesos sospechosos (protección básica contra CSRF).
 *
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
indexController.renderFaq = (req, res) => {
    const referer = req.get('Referer');
    // Permite solo si la petición viene de la misma aplicación o no tiene referer
    if (referer && !referer.startsWith(req.protocol + '://' + req.get('host'))) {
        return res.status(403).send('Acceso no autorizado.');
    }
    res.render('faq');
};

// Exportamos el controlador para su uso en otras partes de la aplicación
module.exports = indexController;
