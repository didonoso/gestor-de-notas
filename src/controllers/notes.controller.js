// Controlador para gestionar las notas (crear, listar, editar y eliminar notas)
const notesController = {};

const Note = require('../models/Note')

/**
 * Renderiza el formulario para agregar una nueva nota.
 * Esta función se encarga de procesar la solicitud y renderizar la vista donde el usuario puede agregar una nueva nota.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
notesController.renderNoteForm = (req, res) => {
    res.render('notes/new-note');
};

/**
 * Crea una nueva nota.
 * Esta función procesa la solicitud para crear una nueva nota con los datos proporcionados.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
notesController.createNewNote = async (req, res) => {
    try {
        // Desestructuramos los datos del cuerpo de la solicitud
        const { title, description } = req.body;

        // Creamos una nueva instancia de Note con los datos proporcionados
        const newNote = new Note({ title, description });

        newNote.user = req.user.id; // Asignamos el ID del usuario autenticado a la nota

        // Guardamos la nueva nota en la base de datos
        await newNote.save();

        req.flash('success_msg', 'Nota creada correctamente'); // Mensaje de éxito
        // Redirigimos al usuario a la lista de notas
        res.redirect('/notas');
    } catch (error) {
        // En caso de error, mostramos un mensaje adecuado
        res.status(500).send('Error al crear la nota');
    }
};

/**
 * Renderiza una lista de todas las notas.
 * Esta función se encarga de mostrar todas las notas existentes en el sistema.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
notesController.renderNotes = async (req, res) => {
    try {
        // Obtenemos todas las notas de la base de datos y las convertimos a formato JSON
        const notes = await Note.find({user: req.user.id}).sort({ createdAt: 'desc' }).lean();

        // Renderizamos la vista 'all-notes' pasando las notas obtenidas
        res.render('notes/all-notes', { notes });
    } catch (error) {
        // En caso de error, mostramos un mensaje adecuado
        res.status(500).send('Error al obtener las notas');
    }
};

/**
 * Renderiza el formulario de edición para una nota existente.
 * Esta función se encarga de mostrar el formulario para editar una nota ya creada.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
notesController.renderEditForm = async (req, res) => {
    const note = await Note.findById(req.params.id).lean();
    if (note.user != req.user.id) {
        req.flash('error_msg', 'No tienes permiso para editar esta nota');
        // Redirigimos al usuario a la lista de notas
        res.redirect('/notas');
    }
    res.render('notes/edit-notes', {note});
};

/**
 * Actualiza una nota existente.
 * Esta función procesa la solicitud para actualizar los datos de una nota existente.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
notesController.updateNote = async (req, res) => {
    try {
        const { title, description } = req.body;
        await Note.findByIdAndUpdate(req.params.id, { title, description });
        req.flash('success_msg', 'Nota actualizada correctamente');
        // Redirigimos al usuario a la lista de notas
        res.redirect('/notas');
    }
    catch (error) {
        // En caso de error, mostramos un mensaje adecuado
        res.status(500).send('Error al actualizar la nota');
    }
};

/**
 * Elimina una nota existente.
 * Esta función procesa la solicitud para eliminar una nota por su ID.
 * 
 * @param {Object} req - El objeto de la solicitud (request).
 * @param {Object} res - El objeto de la respuesta (response).
 */
notesController.deleteNote = async (req, res) => {
    try {
        // Eliminamos la nota por su ID
        await Note.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Nota eliminada correctamente'); // Mensaje de éxito
        // Redirigimos al usuario a la lista de notas
        res.redirect('/notas');
    } catch (error) {
        // En caso de error, mostramos un mensaje adecuado
        res.status(500).send('Error al eliminar la nota');
    }
};

// Exportamos el controlador para su uso en otras partes de la aplicación
module.exports = notesController;
