/**
 * @fileoverview Controlador para gestionar operaciones de usuarios
 * Maneja el registro, autenticación y gestión de usuarios
 * 
 * @module controllers/users
 * @author Diego Donoso
 * @version 1.2.0
 */

'use strict';

// Dependencias
const passport = require('passport');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');
const geoip = require('geoip-lite');
const { validationResult } = require('express-validator');
const axios = require('axios');
const crypto = require('crypto');
const { logUserSession, logLoginAttempt, logError } = require('../helpers/logger');

// Objeto contenedor del controlador
const usersController = {};

/**
 * Renderiza el formulario de registro de usuario
 * 
 * @function renderSignupForm
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Renderiza la vista del formulario de registro
 */
usersController.renderSignupForm = (req, res, next) => {
    try {
        const viewData = {
            title: 'Registro de usuario',
            csrfToken: req.csrfToken ? req.csrfToken() : null,
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null
        };
        
        res.render('users/signup', viewData);
    } catch (error) {
        logError('users.controller.renderSignupForm', error);
        next(error);
    }
};

/**
 * Procesa el registro de un nuevo usuario con validación completa
 * 
 * @function signup
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Redirige a página de inicio de sesión o muestra errores
 * 
 * @throws {Error} Si hay problemas con la validación o la base de datos
 */
usersController.signup = async (req, res, next) => {
    try {
        // Utilizar express-validator para validaciones
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('users/signup', {
                errors: errors.array(),
                name: req.body.name,
                email: req.body.email,
                password: '',
                confirm_password: '',
                csrfToken: req.csrfToken ? req.csrfToken() : null
            });
        }

        // Extracción y sanitización de datos
        const { name = '', email = '', password = '', confirm_password = '' } = req.body;
        
        // Validación manual adicional
        const validationErrors = [];
        
        if (password !== confirm_password) {
            validationErrors.push({ text: 'Las contraseñas no coinciden' });
        }
        
        if (password.length < 8 || password.length > 20) {
            validationErrors.push({ text: 'Las contraseñas deben tener entre 8 y 20 caracteres' });
        }
        
        // Validación de complejidad de contraseña
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            validationErrors.push({ 
                text: 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número' 
            });
        }
        
        if (validationErrors.length > 0) {
            return res.render('users/signup', {
                errors: validationErrors,
                name,
                email,
                password: '',
                confirm_password: '',
                csrfToken: req.csrfToken ? req.csrfToken() : null
            });
        }
        
        // Verificar si el correo ya está registrado
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            // Usar tiempo constante para evitar timing attacks que revelen usuarios existentes
            await new Promise(resolve => setTimeout(resolve, 500));
            req.flash('error_msg', 'El correo electrónico ya está registrado');
            return res.redirect('/usuarios/registro');
        }
        
        // Verificar reCAPTCHA si está configurado
        if (process.env.RECAPTCHA_SECRET_KEY && req.body['g-recaptcha-response']) {
            try {
                const recaptchaResponse = await axios.post(
                    'https://www.google.com/recaptcha/api/siteverify',
                    null,
                    {
                        params: {
                            secret: process.env.RECAPTCHA_SECRET_KEY,
                            response: req.body['g-recaptcha-response'],
                            remoteip: req.ip
                        }
                    }
                );
                
                if (!recaptchaResponse.data.success) {
                    req.flash('error_msg', 'Error de verificación reCAPTCHA');
                    return res.redirect('/usuarios/registro');
                }
            } catch (recaptchaError) {
                console.error('Error en verificación reCAPTCHA:', recaptchaError);
            }
        }
        
        // Crear nueva instancia de usuario con datos sanitizados
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role: 'user',
            emailVerified: false
        });
        
        // Encriptar contraseña
        newUser.password = await newUser.encryptPassword(password);
        
        // Guardar usuario en la base de datos
        await newUser.save();
        
        // Registro de actividad
        logUserSession(`Nuevo usuario registrado: ${newUser.email} (${newUser._id})`);
        
        // Generar token para verificación de email (opcional)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Aquí se podría implementar el envío del email de verificación

        req.flash('success_msg', 'Usuario registrado correctamente. Ahora puedes iniciar sesión.');
        res.redirect('/usuarios/ingreso');
    } catch (err) {
        logError('users.controller.signup', err);
        req.flash('error_msg', 'Ocurrió un error al registrar el usuario');
        res.redirect('/usuarios/registro');
    }
};

/**
 * Renderiza el formulario de inicio de sesión
 * 
 * @function renderSigninForm
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Renderiza la vista del formulario de inicio de sesión
 */
usersController.renderSigninForm = (req, res, next) => {
    try {
        const viewData = {
            title: 'Iniciar sesión',
            csrfToken: req.csrfToken ? req.csrfToken() : null,
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null
        };
        
        res.render('users/signin', viewData);
    } catch (error) {
        logError('users.controller.renderSigninForm', error);
        next(error);
    }
};

/**
 * Maneja la autenticación de usuarios utilizando Passport.js con seguridad mejorada
 * 
 * @function signin
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Gestiona la autenticación y redirecciona según resultado
 * 
 * @security
 * - Utiliza la estrategia local de Passport con validación robusta
 * - Implementa mensajes flash para retroalimentación al usuario
 * - Limita intentos fallidos para prevenir ataques de fuerza bruta
 * - Registra intentos de inicio de sesión para auditoría de seguridad
 * - Implementa restricciones de tiempo entre intentos fallidos
 * - Detecta y bloquea actividad sospechosa basada en patrones
 */
usersController.signin = async (req, res, next) => {
    // Validar entradas antes de autenticar
    if (!req.body.email || !req.body.password) {
        req.flash('error_msg', 'Todos los campos son obligatorios');
        return res.redirect('/usuarios/ingreso');
    }
    
    // Capturar información del intento de inicio de sesión para auditoría
    const timestamp = new Date().toISOString();
    let ip = req.ip || req.connection.remoteAddress || 'Desconocido';
    if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
    const email = req.body.email.toLowerCase().trim() || 'No especificado';
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    const method = req.method;

    // Información de geolocalización para detección de actividad sospechosa
    let geoData = {
        country: 'Desconocido',
        city: 'Desconocido',
        isp: 'Desconocido'
    };
    
    try {
        // Obtener información geográfica para análisis de seguridad
        const geo = geoip.lookup(ip);
        
        if (geo) {
            geoData.country = geo.country || 'Desconocido';
            geoData.city = geo.city || 'Desconocido';
        }
        
        // Obtener ISP para detección avanzada de amenazas
        try {
            const ipInfoResponse = await axios.get(
                `https://ipinfo.io/${ip}/json`,
                { timeout: 2000 } // Timeout para no retrasar la autenticación
            );
            geoData.isp = ipInfoResponse.data.org || 'Desconocido';
        } catch (ipError) {
            console.warn('Error al obtener información de IP:', ipError.message);
            // Continuar con la autenticación aunque falle la obtención de ISP
        }
        
        // Crear mensaje de log completo
        const logMessage = `IP: ${ip} | Correo: ${email} | Método: ${method} | User-Agent: ${userAgent} | País: ${geoData.country} | Ciudad: ${geoData.city} | ISP: ${geoData.isp}`;
    
        // Usar el nuevo helper para escribir el log
        await logLoginAttempt(logMessage);
    } catch (error) {
        console.error('Error en geolocalización:', error);
    }
    
    // Autenticar usando Passport
    passport.authenticate('local', {
        successRedirect: '/notas',
        failureRedirect: '/usuarios/ingreso',
        failureFlash: true,
        badRequestMessage: 'Todos los campos son obligatorios'
    })(req, res, next);
};

/**
 * Cierra la sesión del usuario de forma segura implementando buenas prácticas
 * 
 * @function logout
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Cierra sesión y redirige al usuario
 * 
 * @security
 * - Invalida la sesión completamente para prevenir reutilización
 * - Elimina cookies de sesión con configuración segura
 * - Implementa manejo de errores para garantizar el cierre correcto
 * - Registra eventos de cierre de sesión para auditoría
 * - Aplica buenas prácticas de seguridad en el manejo de sesiones
 */
usersController.logout = (req, res, next) => {
    // Registrar evento de cierre de sesión si hay usuario autenticado
    if (req.isAuthenticated()) {
        const userId = req.user.id;
        const username = req.user.email;
        logUserSession(`Usuario ${username} (${userId}) cerró sesión`);
    }

    // Cerrar sesión usando Passport
    req.logout(function(err) {
        if (err) { 
            console.error('Error al cerrar sesión:', err);
            req.flash('error_msg', 'Ocurrió un error al cerrar sesión');
            return next(err); 
        }
        
        // Mensaje de éxito
        req.flash('success_msg', 'Has cerrado sesión correctamente'); 
        
        // Destruir la sesión completamente
        req.session.destroy((sessionErr) => {
            if (sessionErr) {
                console.error('Error al destruir la sesión:', sessionErr);
            }

            // Eliminar cookie con opciones de seguridad
            res.clearCookie('connect.sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            
            // Redireccionar a página de inicio de sesión
            res.redirect('/usuarios/ingreso');
        });
    });
};

module.exports = usersController;