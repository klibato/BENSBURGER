/**
 * Script pour ajouter display_order et image_url aux produits
 * Sera exécuté automatiquement au démarrage du serveur
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const migrateProductsDisplayOrder = async () => {
  try {
    // Vérifier si la colonne display_order existe
    const [displayOrderResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'display_order';
    `);

    const displayOrderExists = displayOrderResults.length > 0;

    if (!displayOrderExists) {
      logger.info('Colonne display_order non trouvée, ajout en cours...');

      // Ajouter display_order
      await sequelize.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
      `);

      // Mettre à jour les display_order existants
      await sequelize.query(`
        UPDATE products
        SET display_order = id
        WHERE display_order = 0;
      `);

      // Créer l'index
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);
      `);

      logger.info('✅ Colonne display_order ajoutée avec succès');
    }

    // Vérifier si la colonne image_url existe
    const [imageUrlResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'image_url';
    `);

    const imageUrlExists = imageUrlResults.length > 0;

    if (!imageUrlExists) {
      logger.info('Colonne image_url non trouvée, ajout en cours...');

      // Ajouter image_url
      await sequelize.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;
      `);

      // Créer l'index
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url);
      `);

      logger.info('✅ Colonne image_url ajoutée avec succès');
    }

    if (displayOrderExists && imageUrlExists) {
      logger.info('✅ Colonnes display_order et image_url déjà présentes');
    }
  } catch (error) {
    logger.error('❌ Erreur lors de la migration products:', error);
    throw error;
  }
};

module.exports = migrateProductsDisplayOrder;
