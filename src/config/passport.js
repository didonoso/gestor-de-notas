/**
 * Configuración de Passport para la autenticación de usuarios
 */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

/**
 * Estrategia local de autenticación basada en email y contraseña
 */
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // Buscar usuario por correo electrónico usando el método estático que incluye la contraseña
        const user = await User.findByEmailWithPassword(email);
        
        // Si no existe el usuario, retornar mensaje de error
        if (!user) {
            return done(null, false, { message: 'Correo electrónico no existe en el sistema.' });
        }

        // Verificar contraseña
        try {
            const isMatch = await user.matchPassword(password);            
            if (!isMatch) {
                return done(null, false, { message: 'La contraseña ingresada no es correcta. Intente nuevamente.' });
            }
        } catch (pwError) {
            console.error('Error verificando contraseña:', pwError);
            return done(null, false, { message: 'Error verificando credenciales: ' + pwError.message });
        }
        
        // Autenticación exitosa
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

/**
 * Serialización del usuario para almacenarlo en la sesión
 */
passport.serializeUser((user, done) => {
    done(null, user.id);
});

/**
 * Deserialización del usuario para recuperarlo desde la sesión
 */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});