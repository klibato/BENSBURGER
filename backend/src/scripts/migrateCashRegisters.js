const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function migrateCashRegisters() {
  try {
    console.log('\n=== MIGRATION: cash_registers ===\n');

    // SQL de migration directement dans le script
    const migrationSQL = `
      -- Ajouter les nouvelles colonnes
      ALTER TABLE cash_registers
        ADD COLUMN IF NOT EXISTS register_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS opened_by INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS notes TEXT;

      -- Renommer les colonnes existantes
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_registers' AND column_name='opening_amount') THEN
          ALTER TABLE cash_registers RENAME COLUMN opening_amount TO opening_balance;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_registers' AND column_name='closing_amount') THEN
          ALTER TABLE cash_registers RENAME COLUMN closing_amount TO closing_balance;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_registers' AND column_name='actual_cash') THEN
          ALTER TABLE cash_registers RENAME COLUMN actual_cash TO counted_cash;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_registers' AND column_name='expected_cash') THEN
          ALTER TABLE cash_registers RENAME COLUMN expected_cash TO expected_balance;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_registers' AND column_name='cash_difference') THEN
          ALTER TABLE cash_registers RENAME COLUMN cash_difference TO difference;
        END IF;
      END $$;

      -- Ajouter total_cash_collected
      ALTER TABLE cash_registers
        ADD COLUMN IF NOT EXISTS total_cash_collected DECIMAL(10, 2) DEFAULT 0;

      -- Migrer les données existantes
      UPDATE cash_registers SET opened_by = user_id WHERE opened_by IS NULL;

      -- Mettre register_name par défaut
      UPDATE cash_registers
        SET register_name = 'Caisse ' || id
        WHERE register_name IS NULL;

      -- Rendre NOT NULL
      ALTER TABLE cash_registers
        ALTER COLUMN opened_by SET NOT NULL;

      ALTER TABLE cash_registers
        ALTER COLUMN register_name SET NOT NULL;
    `;

    // Exécuter la migration
    await sequelize.query(migrationSQL);

    console.log('✅ Migration cash_registers terminée avec succès!\n');

    // Vérifier la structure
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cash_registers'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Structure de la table cash_registers:');
    console.table(columns);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrateCashRegisters();
