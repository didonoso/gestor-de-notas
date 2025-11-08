/**
 * @fileoverview Controlador para las rutas principales de la aplicación (índice y FAQ).
 * Maneja la renderización de las páginas públicas principales.
 * 
 * @module controllers/index
 * @author Diego Donoso
 * @version 1.2.0
 */

'use strict';

// Objeto contenedor del controlador
const indexController = {};

/**
 * Renderiza la página principal (índice) con datos dinámicos.
 * 
 * @function renderIndex
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @param {Function} next - Función para pasar control al siguiente middleware.
 * @returns {void} Renderiza la vista 'index' con datos de la aplicación.
 * 
 * @example
 * // En routes/index.routes.js
 * router.get('/', indexController.renderIndex);
 */
indexController.renderIndex = (req, res, next) => {
    try {
        // Datos dinámicos para la página principal
        const viewData = {
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            currentYear: new Date().getFullYear(),
            appVersion: process.env.npm_package_version || '1.0.0'
        };
        
        res.render('index', viewData);
    } catch (error) {
        console.error('Error al renderizar la página principal:', error);
        next(error); // Pasar el error al manejador de errores
    }
};

/**
 * Renderiza la página de Preguntas Frecuentes (FAQ) con mejoras de seguridad.
 * Implementa verificación de encabezados para mitigar ataques CSRF.
 * 
 * @function renderFaq
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @param {Function} next - Función para pasar control al siguiente middleware.
 * @returns {void} Renderiza la vista 'faq' con datos contextuales.
 * 
 * @example
 * // En routes/index.routes.js
 * router.get('/faq', indexController.renderFaq);
 */
indexController.renderFaq = (req, res, next) => {
    try {
        // Implementación de seguridad: verificación del referrer
        const referer = req.get('Referer');
        const host = req.get('host');
        
        // Verificar referrer solo en entorno de producción
        if (process.env.NODE_ENV === 'production') {
            if (referer && !referer.startsWith(req.protocol + '://' + host)) {
                console.warn(`Acceso sospechoso a FAQ desde: ${referer}`);
                return res.status(403).render('errors/403', { 
                    message: 'Acceso no autorizado. Por favor, navega desde nuestra página principal.' 
                });
            }
        }
        
        // Datos para la vista
        const viewData = {
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            currentYear: new Date().getFullYear(),
            faqCategories: [
                'General',
                'Cuenta',
                'Notas',
                'Soporte'
            ]
        };
        
        res.render('faq', viewData);
    } catch (error) {
        console.error('Error al renderizar la página FAQ:', error);
        next(error);
    }
};

/**
 * Renderiza la página de contacto con protección anti-spam.
 * 
 * @function renderContact
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @param {Function} next - Función para pasar control al siguiente middleware.
 * @returns {void} Renderiza la vista de contacto con datos necesarios.
 */
indexController.renderContact = (req, res, next) => {
    try {
        // Datos para la vista de contacto
        const viewData = {
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            // Genera un token CSRF para el formulario
            csrfToken: req.csrfToken ? req.csrfToken() : null,
            // Añade timestamp para prevenir envíos duplicados
            timestamp: Date.now()
        };
        
        res.render('contact', viewData);
    } catch (error) {
        console.error('Error al renderizar página de contacto:', error);
        next(error);
    }
};

/**
 * Maneja la salud del sistema y muestra información básica del estado.
 * Útil para monitoreo y verificaciones de estado del servidor.
 * 
 * @function healthCheck
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} JSON con información del estado del sistema.
 */
indexController.healthCheck = (req, res) => {
    const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(healthData);
};

// Exportamos el controlador para su uso en otras partes de la aplicación
module.exports = indexController;
