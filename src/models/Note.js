const {Schema, model} = require('mongoose');

/**
 * Esquema para las notas de los usuarios.
 * Define la estructura de los documentos de notas que se almacenarán en la base de datos.
 * 
 * @typedef {Object} Note
 * @property {string} title - Título de la nota, debe ser único, obligatorio y con un límite de longitud.
 * @property {string} description - Descripción detallada de la nota, con un límite de longitud y obligatorio.
 * @property {Date} createdAt - Fecha de creación (automáticamente añadida por Mongoose).
 * @property {Date} updatedAt - Fecha de la última actualización (automáticamente añadida por Mongoose).
 */
const NoteSchema = new Schema({
    title: {
        type: String,
        required: [true, 'El título es obligatorio.'],
        trim: true, // Elimina los espacios en blanco al inicio y al final
        maxlength: [30, 'El título no puede tener más de 30 caracteres.']
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria.'],
        trim: true,
        maxlength: [500, 'La descripción no puede tener más de 500 caracteres.'] 
    },
    user: {
        type: String,
        required: true
    }
}, {
    timestamps: true // Mongoose añadirá automáticamente 'createdAt' y 'updatedAt'
});

/**
 * Exporta el modelo 'Note' basado en el esquema 'NoteSchema'.
 * El modelo se utilizará para interactuar con la colección de notas en la base de datos.
 * 
 * @returns {Model} El modelo Note.
 */
module.exports = model('Note', NoteSchema);