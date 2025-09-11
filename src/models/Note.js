const {Schema, model, Types} = require('mongoose');

/**
 * Esquema para las notas de los usuarios.
 * Define la estructura de los documentos de notas que se almacenarán en la base de datos.
 * 
 * @typedef {Object} Note
 * @property {string} title - Título de la nota, obligatorio y con un límite de longitud.
 * @property {string} description - Descripción detallada de la nota, con un límite de longitud y obligatorio.
 * @property {Types.ObjectId} user - Referencia al ID del usuario que creó la nota.
 * @property {boolean} isActive - Estado activo/inactivo de la nota (para borrado lógico).
 * @property {Date} createdAt - Fecha de creación (automáticamente añadida por Mongoose).
 * @property {Date} updatedAt - Fecha de la última actualización (automáticamente añadida por Mongoose).
 */
const NoteSchema = new Schema({
    title: {
        type: String,
        required: [true, 'El título es obligatorio.'],
        trim: true, // Elimina los espacios en blanco al inicio y al final
        maxlength: [30, 'El título no puede tener más de 30 caracteres.'],
        index: true // Mejora rendimiento en búsquedas por título
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria.'],
        trim: true,
        maxlength: [500, 'La descripción no puede tener más de 500 caracteres.'],
        // Sanitizamos HTML para prevenir XSS
        set: (value) => {
            return value.replace(/<[^>]*>/g, '');
        }
    },
    user: {
        type: Types.ObjectId,
        ref: 'User',
        required: [true, 'El usuario es obligatorio.'],
        index: true // Mejora rendimiento en búsquedas por usuario
    },
    isActive: {
        type: Boolean,
        default: true,
        select: true // Siempre visible en las consultas
    }
}, {
    timestamps: true, // Mongoose añadirá automáticamente 'createdAt' y 'updatedAt'
    toJSON: { 
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v; // Elimina el campo __v de las respuestas JSON
            return ret;
        }
    },
    toObject: { virtuals: true }
});

/**
 * Agrega una fecha formateada como virtual property para facilitar su uso en las vistas.
 * @returns {string} Fecha formateada en formato local.
 */
NoteSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString();
});

/**
 * Agrega un resumen de la descripción como virtual property.
 * @returns {string} Resumen del contenido de la nota.
 */
NoteSchema.virtual('summary').get(function() {
    const maxLength = 100;
    return this.description.length > maxLength 
        ? `${this.description.substring(0, maxLength)}...` 
        : this.description;
});

/**
 * Método estático para buscar notas por texto en título o descripción
 * Optimiza las búsquedas al utilizar índices
 * @param {string} searchText - Texto a buscar
 * @returns {Promise<Array>} - Array de notas que coinciden con la búsqueda
 */
NoteSchema.statics.searchByText = function(searchText) {
    return this.find({
        isActive: true,
        $or: [
            { title: new RegExp(searchText, 'i') },
            { description: new RegExp(searchText, 'i') }
        ]
    }).sort({ createdAt: -1 });
};

/**
 * Método de instancia para marcar una nota como inactiva (borrado lógico)
 * Más seguro que eliminar físicamente los registros
 * @returns {Promise<Document>} - Nota actualizada
 */
NoteSchema.methods.deactivate = async function() {
    this.isActive = false;
    return this.save();
};

// Middleware para asegurar que solo se obtengan notas activas por defecto
NoteSchema.pre('find', function() {
    // Si no se ha especificado isActive en la consulta, filtrar solo las activas
    if (!this._conditions.hasOwnProperty('isActive')) {
        this._conditions.isActive = true;
    }
});

/**
 * Exporta el modelo 'Note' basado en el esquema 'NoteSchema'.
 * El modelo se utilizará para interactuar con la colección de notas en la base de datos.
 * 
 * @returns {Model} El modelo Note.
 */
module.exports = model('Note', NoteSchema);