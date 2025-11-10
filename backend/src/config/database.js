const { Sequelize } = require('sequelize');
const config = require('./env');
const logger = require('../utils/logger');

// Créer une instance Sequelize
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: config.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  }
);

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à PostgreSQL établie avec succès');
    return true;
  } catch (error) {
    logger.error('❌ Impossible de se connecter à PostgreSQL:', error);
    return false;
  }
};

// Fonction pour synchroniser les models (ATTENTION: ne pas utiliser en prod)
const syncModels = async (force = false) => {
  try {
    await sequelize.sync({ force });
    logger.info(`✅ Models synchronisés ${force ? '(force)' : ''}`);
  } catch (error) {
    logger.error('❌ Erreur lors de la synchronisation des models:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncModels,
};
