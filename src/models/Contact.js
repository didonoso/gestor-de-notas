/**
 * @fileoverview Modelo de Mongoose para mensajes de contacto
 * @module models/Contact
 * @version 1.0.0
 */

const { Schema, model } = require('mongoose');

/**
 * Esquema de mensaje de contacto
 * @typedef {Object} Contact
 * @property {string} name - Nombre completo del remitente
 * @property {string} email - Correo electrónico del remitente
 * @property {string} subject - Asunto del mensaje
 * @property {string} message - Contenido del mensaje
 * @property {string} status - Estado del mensaje (pending, read, replied)
 * @property {ObjectId} userId - ID del usuario (si está autenticado)
 * @property {string} ipAddress - Dirección IP del remitente (para seguridad)
 * @property {Date} createdAt - Fecha de creación automática
 * @property {Date} updatedAt - Fecha de última actualización
 */
const ContactSchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    email: {
        type: String,
        required: [true, 'El correo electrónico es obligatorio'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo electrónico válido']
    },
    subject: {
        type: String,
        required: [true, 'El asunto es obligatorio'],
        trim: true,
        minlength: [3, 'El asunto debe tener al menos 3 caracteres'],
        maxlength: [200, 'El asunto no puede exceder 200 caracteres']
    },
    message: {
        type: String,
        required: [true, 'El mensaje es obligatorio'],
        trim: true,
        minlength: [10, 'El mensaje debe tener al menos 10 caracteres'],
        maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres']
    },
    status: {
        type: String,
        enum: ['pending', 'read', 'replied'],
        default: 'pending'
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    }
}, {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    versionKey: false
});

/**
 * Índices para mejorar el rendimiento de búsquedas
 */
ContactSchema.index({ email: 1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ createdAt: -1 });

/**
 * Método virtual para obtener el nombre del estado en español
 */
ContactSchema.virtual('statusText').get(function() {
    const statusMap = {
        'pending': 'Pendiente',
        'read': 'Leído',
        'replied': 'Respondido'
    };
    return statusMap[this.status] || 'Desconocido';
});

/**
 * Método para marcar como leído
 */
ContactSchema.methods.markAsRead = function() {
    this.status = 'read';
    return this.save();
};

/**
 * Método para marcar como respondido
 */
ContactSchema.methods.markAsReplied = function() {
    this.status = 'replied';
    return this.save();
};

module.exports = model('Contact', ContactSchema);
