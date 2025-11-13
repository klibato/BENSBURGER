const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Migration pour ajouter les champs de configuration SumUp, Imprimante et Email
 */
const migrateStoreConfigFields = async () => {
  try {
    logger.info('🔄 Migration des champs de configuration store_settings...');

    // Vérifier si les colonnes existent déjà
    const [sumupResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'store_settings' AND column_name = 'sumup_config';
    `);

    const [printerResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'store_settings' AND column_name = 'printer_config';
    `);

    const [emailResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'store_settings' AND column_name = 'email_config';
    `);

    // Ajouter sumup_config si n'existe pas
    if (sumupResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE store_settings
        ADD COLUMN sumup_config JSONB DEFAULT '{"enabled": false, "api_key": "", "merchant_code": "", "affiliate_key": ""}'::jsonb;
      `);
      logger.info('✅ Colonne sumup_config ajoutée');
    } else {
      logger.info('ℹ️ Colonne sumup_config existe déjà');
    }

    // Ajouter printer_config si n'existe pas
    if (printerResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE store_settings
        ADD COLUMN printer_config JSONB DEFAULT '{"enabled": false, "type": "epson", "interface": "tcp", "ip": "", "port": 9100, "path": "", "auto_print": true}'::jsonb;
      `);
      logger.info('✅ Colonne printer_config ajoutée');
    } else {
      logger.info('ℹ️ Colonne printer_config existe déjà');
    }

    // Ajouter email_config si n'existe pas
    if (emailResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE store_settings
        ADD COLUMN email_config JSONB DEFAULT '{"enabled": false, "smtp_host": "", "smtp_port": 587, "smtp_secure": false, "smtp_user": "", "smtp_password": "", "from_email": "", "from_name": ""}'::jsonb;
      `);
      logger.info('✅ Colonne email_config ajoutée');
    } else {
      logger.info('ℹ️ Colonne email_config existe déjà');
    }

    logger.info('✅ Migration des champs de configuration terminée avec succès');
  } catch (error) {
    logger.error('❌ Erreur lors de la migration des champs de configuration:', error);
    throw error;
  }
};

module.exports = migrateStoreConfigFields;
