/**
 * @fileoverview Configuración y conexión a la base de datos MongoDB
 * @module database
 * @version 1.0.0
 */

const mongoose = require('mongoose');

/**
 * Configuración de la conexión a MongoDB
 * Obtiene los parámetros de conexión desde variables de entorno
 * Soporta tanto MongoDB local como MongoDB Atlas (producción)
 */
const {
  MULTIGESTOR_MONGODB_HOST,
  MULTIGESTOR_MONGODB_PORT,
  MULTIGESTOR_MONGODB_DATABASE,
  MONGODB_USER,
  MONGODB_PASSWORD,
  MONGODB_URI // Para MongoDB Atlas en producción
} = process.env;

// Construye la URI de conexión
// 1. Si existe MONGODB_URI (Atlas), usarlo directamente
// 2. Si hay credenciales, construir URI con autenticación
// 3. Si no, usar conexión local sin autenticación
let connectionString;

if (MONGODB_URI) {
  // MongoDB Atlas (producción)
  connectionString = MONGODB_URI;
} else if (MONGODB_USER && MONGODB_PASSWORD) {
  // MongoDB local con autenticación
  connectionString = `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MULTIGESTOR_MONGODB_HOST}:${MULTIGESTOR_MONGODB_PORT}/${MULTIGESTOR_MONGODB_DATABASE}`;
} else {
  // MongoDB local sin autenticación (desarrollo)
  connectionString = `mongodb://${MULTIGESTOR_MONGODB_HOST}:${MULTIGESTOR_MONGODB_PORT}/${MULTIGESTOR_MONGODB_DATABASE}`;
}

const DB_URI = connectionString;

/**
 * Función asíncrona para establecer la conexión con MongoDB
 * Incluye manejo de errores y opciones de configuración optimizadas
 */
async function connectDB() {
  try {
    // Opciones de configuración recomendadas para MongoDB
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout después de 5 segundos
      maxPoolSize: 10 // Mantener hasta 10 conexiones abiertas
    };

    // Conectar a la base de datos
    await mongoose.connect(DB_URI, options);

    // Evento de conexión exitosa
    mongoose.connection.on('connected', () => {
      console.log('✅ Conexión establecida con MongoDB');
      console.log(`📁 Base de datos: ${MULTIGESTOR_MONGODB_DATABASE}`);
    });

    // Evento de error después de la conexión inicial
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error en la conexión MongoDB:', err);
    });

    // Evento de desconexión
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Desconectado de MongoDB');
    });

    // Manejar señales de terminación para cerrar la conexión de manera limpia
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada debido a la terminación de la aplicación');
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Error al conectar con MongoDB:', err.message);
    // En un entorno de producción, podría ser útil reintentar la conexión
    // o enviar una notificación al administrador
  }
}

// Iniciar la conexión
connectDB();