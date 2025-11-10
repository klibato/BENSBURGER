const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function migrateCashRegisters() {
  try {
    console.log('\n=== MIGRATION: cash_registers ===\n');

    // Lire le fichier SQL de migration
    const migrationPath = path.join(__dirname, '../../..', 'database/migrations/001_update_cash_registers.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

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
