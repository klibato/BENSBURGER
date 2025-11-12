const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Migration pour ajouter les configurations avancées du commerce
 * - Catégories personnalisables
 * - Taux de TVA configurables
 * - Configuration des moyens de paiement
 * - Logo du commerce
 */

const migrateStoreConfig = async () => {
  try {
    logger.info('🔄 Vérification de la configuration du commerce...');

    // Vérifier si les colonnes existent déjà
    const [categoriesResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'store_settings' AND column_name = 'categories';
    `);

    const categoriesExists = categoriesResults.length > 0;

    if (!categoriesExists) {
      logger.info('➕ Ajout des configurations avancées du commerce...');

      // Ajouter les colonnes pour catégories, taux TVA, moyens de paiement, logo
      await sequelize.query(`
        ALTER TABLE store_settings
        ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS vat_rates JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS logo_url TEXT,
        ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#FF6B35',
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR',
        ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(5) DEFAULT '€',
        ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'fr-FR',
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Paris';
      `);

      logger.info('✅ Colonnes de configuration ajoutées');
    } else {
      logger.info('✅ Colonnes de configuration déjà présentes');
    }

    // Toujours vérifier et insérer/mettre à jour les valeurs par défaut
    logger.info('🔄 Vérification des données de configuration...');

    await sequelize.query(`
      INSERT INTO store_settings (
        id,
        categories,
        vat_rates,
        payment_methods,
        theme_color,
        currency,
        currency_symbol,
        language,
        timezone
      )
      VALUES (
        1,
        '[
          {"id": "burgers", "name": "Burgers", "icon": "🍔", "color": "#FF6B35", "display_order": 1},
          {"id": "sides", "name": "Accompagnements", "icon": "🍟", "color": "#F7931E", "display_order": 2},
          {"id": "drinks", "name": "Boissons", "icon": "🥤", "color": "#4ECDC4", "display_order": 3},
          {"id": "desserts", "name": "Desserts", "icon": "🍰", "color": "#FFE66D", "display_order": 4},
          {"id": "menus", "name": "Menus", "icon": "📦", "color": "#A8DADC", "display_order": 5}
        ]'::jsonb,
        '[
          {"rate": 5.5, "name": "TVA 5.5%", "description": "Produits alimentaires de base"},
          {"rate": 10, "name": "TVA 10%", "description": "Restauration sur place"},
          {"rate": 20, "name": "TVA 20%", "description": "Produits standard"}
        ]'::jsonb,
        '{
          "cash": {"enabled": true, "name": "Espèces", "icon": "💵"},
          "card": {"enabled": true, "name": "Carte bancaire", "icon": "💳"},
          "meal_voucher": {"enabled": true, "name": "Ticket restaurant", "icon": "🎫"},
          "mixed": {"enabled": true, "name": "Paiement mixte", "icon": "💰"}
        }'::jsonb,
        '#FF6B35',
        'EUR',
        '€',
        'fr-FR',
        'Europe/Paris'
      )
      ON CONFLICT (id) DO UPDATE SET
        categories = CASE
          WHEN store_settings.categories = '[]'::jsonb OR store_settings.categories IS NULL
          THEN EXCLUDED.categories
          ELSE store_settings.categories
        END,
        vat_rates = CASE
          WHEN store_settings.vat_rates = '[]'::jsonb OR store_settings.vat_rates IS NULL
          THEN EXCLUDED.vat_rates
          ELSE store_settings.vat_rates
        END,
        payment_methods = CASE
          WHEN store_settings.payment_methods = '{}'::jsonb OR store_settings.payment_methods IS NULL
          THEN EXCLUDED.payment_methods
          ELSE store_settings.payment_methods
        END,
        theme_color = COALESCE(store_settings.theme_color, EXCLUDED.theme_color),
        currency = COALESCE(store_settings.currency, EXCLUDED.currency),
        currency_symbol = COALESCE(store_settings.currency_symbol, EXCLUDED.currency_symbol),
        language = COALESCE(store_settings.language, EXCLUDED.language),
        timezone = COALESCE(store_settings.timezone, EXCLUDED.timezone);
    `);

    logger.info('✅ Valeurs de configuration vérifiées et mises à jour');
    logger.info('✅ Migration configuration du commerce terminée');
  } catch (error) {
    logger.error('❌ Erreur lors de la migration configuration du commerce:', error);
    throw error;
  }
};

module.exports = migrateStoreConfig;
