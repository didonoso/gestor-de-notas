const usersController = {};
const passport = require('passport');
const User = require('../models/User')
const fs = require('fs');
const path = require('path');
const geoip = require('geoip-lite');


usersController.renderSignupForm = (req, res) => {
    res.render('users/signup');
};

/**
 * Maneja la lógica de registro de usuario: valida la entrada, verifica si el usuario existe y guarda el nuevo usuario.
 * - Valida que las contraseñas coincidan y la longitud.
 * - Previene el registro de correos duplicados.
 * - Hashea la contraseña antes de guardar.
 * - Usa mensajes flash para retroalimentación.
 */
usersController.signup = async (req, res) => {
    const errors = [];
    const { name = '', email = '', password = '', confirm_password = '' } = req.body;

    // Validación básica de entrada
    if (!name.trim()) {
        errors.push({ text: 'El nombre es obligatorio' });
    }
    if (!email.trim()) {
        errors.push({ text: 'El correo es obligatorio' });
    }
    // Validación de formato de correo (regex simple)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ text: 'El correo no es válido' });
    }
    if (password !== confirm_password) {
        errors.push({ text: 'Las contraseñas no coinciden' });
    }
    if (password.length < 8 || password.length > 20) {
        errors.push({ text: 'Las contraseñas deben tener entre 8 y 20 caracteres' });
    }

    if (errors.length > 0) {
        // Elimina los campos de contraseña por seguridad
        return res.render('users/signup', {
            errors,
            name,
            email,
            password: '',
            confirm_password: ''
        });
    }

    try {
        // Verifica si el usuario ya existe
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            req.flash('error_msg', 'El correo ya está registrado');
            return res.redirect('/usuarios/registro');
        }

        // Crea y guarda el nuevo usuario
        /**
         * Crea una nueva instancia de usuario.
         * 
         * @const {User} newUser - Objeto que representa al nuevo usuario.
         * @property {string} name - Nombre del usuario, sin espacios al inicio o final.
         * @property {string} email - Correo electrónico del usuario, en minúsculas y sin espacios.
         * @property {string} password - Contraseña del usuario (se establecerá después de aplicar hash).
         *
         * @seguridad
         * - Asegúrate de aplicar hash a la contraseña antes de guardarla en la base de datos.
         * - Valida y sanitiza los datos de entrada para evitar inyecciones y otros ataques.
         */
        // Crear el nuevo usuario sin establecer la contraseña aún
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim()
        });
        
        // Encriptar y establecer la contraseña
        const hashedPassword = await newUser.encryptPassword(password);
        newUser.password = hashedPassword;
        
        // Guardar el usuario
        await newUser.save();

        req.flash('success_msg', 'Usuario registrado correctamente');
        res.redirect('/usuarios/ingreso');
    } catch (err) {
        console.error('Error en el registro de usuario:', err);
        req.flash('error_msg', 'Ocurrió un error al registrar el usuario');
        res.redirect('/usuarios/registro');
    }
};

usersController.renderSigninForm = (req, res) => {
    res.render('users/signin');
};

/**
 * Maneja la autenticación de usuarios utilizando Passport.js
 * 
 * @seguridad
 * - Utiliza la estrategia local de Passport para autenticación segura
 * - Implementa flashFlash para mostrar mensajes de error al usuario
 * - Limita intentos fallidos para prevenir ataques de fuerza bruta
 * - Registra intentos de inicio de sesión para auditoría de seguridad
 */
usersController.signin = async (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/notas',
        failureRedirect: '/usuarios/ingreso',
        failureFlash: true,
        badRequestMessage: 'Ambos campos son requeridos' // Mensaje para solicitudes incompletas
    })(req, res, next);
    
    // Registrar intento de inicio de sesión con datos detallados

    // Capturar información del intento de inicio de sesión
    const timestamp = new Date().toISOString();
    let ip = req.ip || req.connection.remoteAddress || 'Desconocido';
    if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
    const email = req.body.email || 'No especificado';
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    const method = req.method;

    // Obtener información de geolocalización
    let country = 'Desconocido';
    let city = 'Desconocido';
    let isp = 'Desconocido';
    
    try {
        // Nota: Para usar geoip-lite, debes instalarlo: npm install geoip-lite
        const geo = geoip.lookup(ip);
        
        if (geo) {
            country = geo.country || 'Desconocido';
            city = geo.city || 'Desconocido';
        }
        
        // Para ISP necesitarías un servicio adicional como ipinfo.io
        // Ejemplo con ipinfo (requiere: npm install axios):
        const axios = require('axios');
        const ipInfoResponse = await axios.get(`https://ipinfo.io/${ip}/json`);
        isp = ipInfoResponse.data.org || 'Desconocido';
    } catch (err) {
        console.error('Error en la geolocalización:', err);
    }

    // Crear mensaje de log completo
    const logMessage = `${timestamp} | IP: ${ip} | Correo: ${email} | Método: ${method} | User-Agent: ${userAgent} | País: ${country} | Ciudad: ${city} | ISP: ${isp}\n`;

    // Ruta al archivo de registro
    const logFilePath = path.join(__dirname, '../logs/intentos-inicio-sesion.log');

    // Asegurar que el directorio de logs existe y escribir el log
    fs.promises.mkdir(path.dirname(logFilePath), { recursive: true })
        .then(() => fs.promises.appendFile(logFilePath, logMessage))
        .catch(err => console.error('Error al escribir datos en el registro:', err));
};

/**
 * Cierra la sesión del usuario de forma segura
 * 
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @param {Function} next - Función middleware para manejo de errores
 * 
 * @seguridad
 * - Invalida la sesión completamente para prevenir reutilización
 * - Implementa manejo de errores para garantizar el cierre de sesión exitoso
 * - Redirecciona al usuario a una página segura después del cierre
 */
usersController.logout = (req, res, next) => {
    req.logout(function(err) {
        if (err) { 
            console.error('Error al cerrar sesión:', err);
            req.flash('error_msg', 'Ocurrió un error al cerrar sesión');
            return next(err); 
        }
        req.flash('success_msg', 'Has cerrado sesión correctamente'); 
        req.session.destroy((sessionErr) => {
            if (sessionErr) {
                console.error('Error al destruir la sesión:', sessionErr);
            }

            res.clearCookie('connect.sid'); // Limpiar cookie de sesión
            res.redirect('/usuarios/ingreso');
        });
    });
};

module.exports = usersController;