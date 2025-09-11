const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Esquema de usuario para almacenar y gestionar la información de usuarios.
 * @typedef {Object} User
 * @property {string} name - Nombre del usuario.
 * @property {string} email - Correo electrónico del usuario (único e indexado).
 * @property {string} password - Contraseña encriptada del usuario (nunca devuelta en consultas).
 * @property {string} role - Rol del usuario ('user' o 'admin').
 * @property {Date} lastLogin - Fecha del último inicio de sesión.
 * @property {boolean} isActive - Estado de activación de la cuenta.
 * @property {boolean} emailVerified - Indica si el correo ha sido verificado.
 * @property {Date} createdAt - Fecha de creación (automáticamente añadida por Mongoose).
 * @property {Date} updatedAt - Fecha de la última actualización (automáticamente añadida por Mongoose).
 */
const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres'],
      // Sanitización básica para evitar inyección
      set: (value) => value.replace(/[<>]/g, '')
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // Optimiza búsquedas por email
      match: [
        /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
        'Por favor ingresa un correo electrónico válido'
      ]
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // No se incluye en las consultas por defecto (seguridad)
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      required: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password; // Asegura que la contraseña nunca se envíe
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

/**
 * Hook que se ejecuta antes de guardar un usuario para validar la contraseña
 * Nota: La encriptación se maneja explícitamente en el controlador con encryptPassword()
 */
UserSchema.pre('save', function(next) {
  // No encriptamos aquí ya que lo hacemos explícitamente en el controlador
  next();
});

/**
 * Encripta la contraseña antes de almacenarla en la base de datos.
 * @param {string} password - Contraseña proporcionada por el usuario.
 * @returns {Promise<string>} Contraseña encriptada.
 */
UserSchema.methods.encryptPassword = async function(password) {
  try {
    // Generar un 'salt' con nivel de complejidad de 12 (más seguro)
    const salt = await bcrypt.genSalt(12);
    // Encriptar la contraseña usando el 'salt' generado
    return bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(`Error al encriptar la contraseña: ${error.message}`);
  }
};

/**
 * Compara una contraseña proporcionada con la almacenada en la base de datos.
 * @param {string} password - Contraseña proporcionada por el usuario.
 * @returns {Promise<boolean>} true si las contraseñas coinciden, false en caso contrario.
 */
UserSchema.methods.matchPassword = async function(password) {
  try {
    // Verificar que tenemos la contraseña disponible en el documento
    if (!this.password) {
      throw new Error('La contraseña del usuario no está disponible en el documento. Use User.findOne().select("+password")');
    }
    
    // Comparar la contraseña proporcionada con la almacenada en la base de datos
    const isMatch = await bcrypt.compare(password, this.password);
    return isMatch;
  } catch (error) {
    console.error('Error completo:', error);
    throw new Error(`Error al comparar las contraseñas: ${error.message}`);
  }
};

/**
 * Actualiza el contador de intentos de inicio de sesión fallidos
 * @param {boolean} isSuccessful - Si el intento de inicio de sesión fue exitoso
 * @returns {Promise<Document>} - Usuario actualizado
 */
UserSchema.methods.updateLoginAttempts = async function(isSuccessful) {
  // Si el inicio de sesión fue exitoso, resetear contadores
  if (isSuccessful) {
    if (this.loginAttempts !== 0 || this.lockUntil) {
      // Resetear intentos fallidos y bloqueo
      this.loginAttempts = 0;
      this.lockUntil = null;
      await this.save();
    }
    // Actualizar última fecha de inicio de sesión
    this.lastLogin = new Date();
    return this.save();
  }
  
  // Incrementar intentos fallidos
  this.loginAttempts += 1;
  
  // Bloquear la cuenta después de 5 intentos fallidos
  if (this.loginAttempts >= 5) {
    // Bloqueo de 30 minutos
    const lockTime = new Date(Date.now() + 30 * 60 * 1000);
    this.lockUntil = lockTime;
  }
  
  return this.save();
};

/**
 * Verifica si la cuenta está bloqueada por exceso de intentos de inicio de sesión
 * @returns {boolean} - true si la cuenta está bloqueada
 */
UserSchema.methods.isLocked = function() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Método estático para encontrar un usuario por email con la contraseña incluida
 * para poder realizar la autenticación
 * @param {string} email - Email del usuario
 * @returns {Promise<Document>} - Usuario con contraseña incluida
 */
UserSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email, isActive: true }).select('+password');
};

/**
 * Método estático para desactivar un usuario (borrado lógico)
 * @param {string} userId - ID del usuario
 * @returns {Promise<Document>} - Usuario actualizado
 */
UserSchema.statics.deactivateUser = function(userId) {
  return this.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  );
};

/**
 * Exporta el modelo 'User' basado en el esquema 'UserSchema'.
 * El modelo se utilizará para interactuar con la colección de usuarios en la base de datos.
 * 
 * @returns {Model} El modelo User.
 */
module.exports = model('User', UserSchema);