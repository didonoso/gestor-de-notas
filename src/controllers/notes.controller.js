/**
 * @fileoverview Controlador para gestionar operaciones CRUD de notas
 * Maneja la creación, lectura, actualización y eliminación de notas de usuario
 * 
 * @module controllers/notes
 * @author Diego Donoso
 * @version 1.2.0
 */

'use strict';

// Dependencias
const Note = require('../models/Note');
const { validationResult } = require('express-validator');
const { logNoteActivity, logError } = require('../helpers/logger');

// Objeto contenedor del controlador
const notesController = {};

/**
 * Renderiza el formulario para crear una nueva nota
 * 
 * @function renderNoteForm
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Renderiza la vista del formulario de nota nueva
 */
notesController.renderNoteForm = (req, res, next) => {
    try {
        const viewData = {
            title: 'Crear nueva nota',
            isEdit: false,
            user: req.user,
            csrfToken: req.csrfToken ? req.csrfToken() : null
        };
        
        res.render('notes/new-note', viewData);
    } catch (error) {
        console.error('Error al renderizar formulario de nota:', error);
        next(error);
    }
};

/**
 * Crea una nueva nota con validación y sanitización
 * 
 * @function createNewNote
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Redirige a la lista de notas o muestra errores de validación
 * 
 * @throws {Error} Si hay problemas con la base de datos
 */
notesController.createNewNote = async (req, res, next) => {
    try {
        // Validación de entradas
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('notes/new-note', {
                errors: errors.array(),
                title: req.body.title,
                description: req.body.description,
                user: req.user
            });
        }
        
        // Sanitización y extracción de datos
        const { title, description } = req.body;
        
        // Creación de la nota
        const newNote = new Note({
            title: title.trim(),
            description: description.trim(),
            user: req.user.id
        });
        
        // Guardar en la base de datos
        const savedNote = await newNote.save();
        
        // Registro de actividad y respuesta
        logNoteActivity(`Nueva nota creada - ID: ${savedNote._id}, Usuario: ${req.user.id}, Título: "${title}"`);
        req.flash('success_msg', 'Nota creada correctamente');
        res.redirect('/notas');
    } catch (error) {
        logError('notes.controller.createNewNote', error);
        req.flash('error_msg', 'Error al crear la nota');
        res.redirect('/notas/agregar');
    }
};

/**
 * Renderiza la lista de notas del usuario con paginación y filtros
 * 
 * @function renderNotes
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Renderiza la vista con la lista de notas
 * 
 * @throws {Error} Si hay problemas con la base de datos o el renderizado
 */
notesController.renderNotes = async (req, res, next) => {
    try {
        // Parámetros de paginación y filtrado
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        
        // Construir filtro de búsqueda
        const filter = { 
            user: req.user.id,
            isActive: true // Solo mostrar notas activas
        };
        
        // Añadir búsqueda por texto si se proporciona
        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }
        
        // Consultas paralelas para eficiencia
        const [notes, totalNotes] = await Promise.all([
            // Obtener notas con paginación
            Note.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            
            // Contar total para paginación
            Note.countDocuments(filter)
        ]);
        
        // Calcular metadatos de paginación
        const totalPages = Math.ceil(totalNotes / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        // Renderizar vista con datos
        res.render('notes/all-notes', {
            notes,
            pagination: {
                currentPage: page,
                hasNextPage,
                hasPrevPage,
                nextPage: hasNextPage ? page + 1 : null,
                prevPage: hasPrevPage ? page - 1 : null,
                totalPages,
                totalItems: totalNotes
            },
            search,
            user: req.user
        });
    } catch (error) {
        console.error('Error al obtener notas:', error);
        req.flash('error_msg', 'Error al cargar las notas');
        next(error);
    }
};

/**
 * Renderiza el formulario de edición para una nota existente
 * con verificación de propiedad y validación de entradas
 * 
 * @function renderEditForm
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Renderiza la vista del formulario de edición
 * 
 * @throws {Error} Si la nota no existe o no pertenece al usuario
 */
notesController.renderEditForm = async (req, res, next) => {
    try {
        // Validar formato del ID
        const noteId = req.params.id;
        if (!noteId.match(/^[0-9a-fA-F]{24}$/)) {
            req.flash('error_msg', 'ID de nota inválido');
            return res.redirect('/notas');
        }
        
        // Buscar la nota por ID
        const note = await Note.findById(noteId).lean();
        
        // Verificar si la nota existe
        if (!note) {
            req.flash('error_msg', 'La nota solicitada no existe');
            return res.redirect('/notas');
        }
        
        // Verificar propiedad de la nota
        if (String(note.user) !== String(req.user.id)) {
            console.warn(`Intento de acceso no autorizado a nota ${noteId} por usuario ${req.user.id}`);
            req.flash('error_msg', 'No tienes permiso para editar esta nota');
            return res.redirect('/notas');
        }
        
        // Renderizar vista de edición
        res.render('notes/edit-notes', {
            note,
            title: 'Editar nota',
            isEdit: true,
            user: req.user,
            csrfToken: req.csrfToken ? req.csrfToken() : null
        });
    } catch (error) {
        console.error(`Error al renderizar formulario de edición para nota ${req.params.id}:`, error);
        req.flash('error_msg', 'Error al cargar el formulario de edición');
        next(error);
    }
};

/**
 * Actualiza una nota existente con validación de propiedad y sanitización
 * 
 * @function updateNote
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Redirige a la lista de notas o muestra errores
 * 
 * @throws {Error} Si hay problemas con la validación o la actualización en la base de datos
 */
notesController.updateNote = async (req, res, next) => {
    try {
        const noteId = req.params.id;
        
        // Validación de entradas
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('notes/edit-notes', {
                note: { 
                    _id: noteId,
                    title: req.body.title,
                    description: req.body.description
                },
                errors: errors.array(),
                user: req.user
            });
        }
        
        // Verificar si la nota existe y pertenece al usuario
        const note = await Note.findById(noteId);
        if (!note) {
            req.flash('error_msg', 'La nota no existe');
            return res.redirect('/notas');
        }
        
        if (String(note.user) !== String(req.user.id)) {
            console.warn(`Intento de modificación no autorizada a nota ${noteId} por usuario ${req.user.id}`);
            req.flash('error_msg', 'No tienes permiso para modificar esta nota');
            return res.redirect('/notas');
        }
        
        // Actualizar la nota con sanitización
        const { title, description } = req.body;
        note.title = title.trim();
        note.description = description.trim();
        note.updatedAt = Date.now(); // Actualizar timestamp explícitamente
        
        await note.save();
        
        req.flash('success_msg', 'Nota actualizada correctamente');
        res.redirect('/notas');
    } catch (error) {
        console.error(`Error al actualizar nota ${req.params.id}:`, error);
        req.flash('error_msg', 'Error al actualizar la nota');
        next(error);
    }
};

/**
 * Elimina una nota (implementando borrado lógico)
 * 
 * @function deleteNote
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Redirige a la lista de notas
 * 
 * @throws {Error} Si hay problemas con la operación en la base de datos
 */
notesController.deleteNote = async (req, res, next) => {
    try {
        const noteId = req.params.id;
        
        // Verificar si la nota existe y pertenece al usuario
        const note = await Note.findById(noteId);
        if (!note) {
            req.flash('error_msg', 'La nota no existe');
            return res.redirect('/notas');
        }
        
        if (String(note.user) !== String(req.user.id)) {
            console.warn(`Intento de eliminación no autorizada a nota ${noteId} por usuario ${req.user.id}`);
            req.flash('error_msg', 'No tienes permiso para eliminar esta nota');
            return res.redirect('/notas');
        }
        
        // Implementar borrado lógico en lugar de físico
        if (note.deactivate) {
            // Si tenemos el método deactivate en el modelo
            await note.deactivate();
        } else {
            // Alternativa si el método no está disponible
            note.isActive = false;
            await note.save();
        }
        
        req.flash('success_msg', 'Nota eliminada correctamente');
        res.redirect('/notas');
    } catch (error) {
        console.error(`Error al eliminar nota ${req.params.id}:`, error);
        req.flash('error_msg', 'Error al eliminar la nota');
        next(error);
    }
};

/**
 * Busca notas por texto en título o descripción
 * 
 * @function searchNotes
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar control al siguiente middleware
 * @returns {void} Renderiza resultados de búsqueda o devuelve JSON en caso de solicitud AJAX
 */
notesController.searchNotes = async (req, res, next) => {
    try {
        const searchText = req.query.q || '';
        
        if (!searchText.trim()) {
            return res.redirect('/notas');
        }
        
        // Utilizar el método de búsqueda optimizado del modelo
        const notes = await Note.searchByText(searchText)
            .where('user').equals(req.user.id)
            .limit(20)
            .lean();
        
        // Responder según el tipo de solicitud
        const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
        
        if (isAjax) {
            return res.json({ 
                notes, 
                count: notes.length,
                query: searchText 
            });
        }
        
        res.render('notes/search-results', {
            notes,
            search: searchText,
            user: req.user,
            count: notes.length
        });
    } catch (error) {
        console.error('Error en búsqueda de notas:', error);
        
        if (req.xhr) {
            return res.status(500).json({ error: 'Error en la búsqueda' });
        }
        
        req.flash('error_msg', 'Error al buscar notas');
        next(error);
    }
};

// Exportamos el controlador para su uso en otras partes de la aplicación
module.exports = notesController;
