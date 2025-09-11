const { Router } = require('express');
const router = Router();

// Importamos las funciones del controlador de notas
const { 
    renderNoteForm, 
    createNewNote, 
    renderNotes, 
    renderEditForm, 
    updateNote, 
    deleteNote 
} = require('../controllers/notes.controller');
const { isAuthenticated } = require('../helpers/auth');

/**
 * Ruta para renderizar el formulario de agregar una nueva nota
 * @route GET /notas/agregar
 * @desc Renderiza un formulario para agregar una nueva nota
 */
router.get('/notas/agregar', isAuthenticated, renderNoteForm);

/**
 * Ruta para crear una nota nueva
 * @route POST /notas/nota-nueva
 * @desc Procesa y crea una nota nueva con los datos enviados
 */
router.post('/notas/nota-nueva', isAuthenticated, createNewNote);

/**
 * Ruta para listar todas las notas
 * @route GET /notas
 * @desc Renderiza una lista de todas las notas existentes
 */
router.get('/notas', isAuthenticated, renderNotes);

/**
 * Ruta para renderizar el formulario de edición de una nota existente
 * @route GET /notas/editar/:id
 * @param {string} id - ID de la nota a editar
 * @desc Renderiza el formulario de edición de la nota con el ID especificado
 */
router.get('/notas/editar/:id', isAuthenticated, renderEditForm);

/**
 * Ruta para actualizar una nota existente
 * @route PUT /notas/editar/:id
 * @param {string} id - ID de la nota a actualizar
 * @desc Actualiza la nota con el ID especificado
 */
router.put('/notas/editar/:id', isAuthenticated, updateNote);

/**
 * Ruta para eliminar una nota existente
 * @route DELETE /notas/borrar/:id
 * @param {string} id - ID de la nota a eliminar
 * @desc Elimina la nota con el ID especificado
 */
router.delete('/notas/borrar/:id', isAuthenticated, deleteNote);

// Exportamos el router para que pueda ser utilizado en otros archivos
module.exports = router;
