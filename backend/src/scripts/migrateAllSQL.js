/**
 * Script de migration SQL automatique
 * Exécute toutes les migrations SQL dans database/migrations/ qui n'ont pas encore été appliquées
 * Utilise une table migrations_history pour tracker les migrations exécutées
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Créer la table migrations_history si elle n'existe pas
 */
async function createMigrationsTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    logger.error('Erreur lors de la création de la table migrations_history:', error);
    throw error;
  }
}

/**
 * Récupérer la liste des migrations déjà exécutées
 */
async function getExecutedMigrations() {
  try {
    const [results] = await sequelize.query(`
      SELECT migration_name FROM migrations_history ORDER BY id ASC;
    `);
    return results.map(row => row.migration_name);
  } catch (error) {
    logger.error('Erreur lors de la récupération des migrations exécutées:', error);
    return [];
  }
}

/**
 * Marquer une migration comme exécutée
 */
async function markMigrationAsExecuted(migrationName) {
  try {
    await sequelize.query(`
      INSERT INTO migrations_history (migration_name)
      VALUES (:migrationName)
      ON CONFLICT (migration_name) DO NOTHING;
    `, {
      replacements: { migrationName }
    });
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement de la migration ${migrationName}:`, error);
    throw error;
  }
}

/**
 * Exécuter une migration SQL
 */
async function runMigration(migrationFile, migrationPath) {
  try {
    logger.info(`  📝 Exécution: ${migrationFile}`);

    // Lire le fichier SQL
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Exécuter la migration
    await sequelize.query(sql);

    // Marquer comme exécutée
    await markMigrationAsExecuted(migrationFile);

    logger.info(`  ✅ Migration ${migrationFile} appliquée avec succès`);
    return true;
  } catch (error) {
    logger.error(`  ❌ Erreur lors de l'exécution de ${migrationFile}:`, error.message);
    // Ne pas bloquer les autres migrations, continuer
    return false;
  }
}

/**
 * Exécuter toutes les migrations SQL en attente
 */
async function migrateAllSQL() {
  try {
    // Créer la table d'historique si nécessaire
    await createMigrationsTable();

    // Récupérer les migrations déjà exécutées
    const executedMigrations = await getExecutedMigrations();

    // Lister tous les fichiers de migration SQL
    // En développement local : ../../../database/migrations
    // En Docker : /database/migrations (volume monté)
    const migrationsDir = fs.existsSync('/database/migrations')
      ? '/database/migrations'
      : path.join(__dirname, '../../../database/migrations');

    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Dossier migrations non trouvé: ${migrationsDir}`);
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Tri alphabétique (001_, 002_, etc.)

    // Filtrer les migrations non exécutées
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      logger.info('✅ Toutes les migrations SQL sont à jour');
      return;
    }

    logger.info(`🔄 ${pendingMigrations.length} migration(s) SQL à exécuter:`);

    // Exécuter chaque migration en attente
    let successCount = 0;
    let errorCount = 0;

    for (const file of pendingMigrations) {
      const migrationPath = path.join(migrationsDir, file);
      const success = await runMigration(file, migrationPath);

      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    if (errorCount > 0) {
      logger.warn(`⚠️  ${successCount}/${pendingMigrations.length} migrations réussies, ${errorCount} erreur(s)`);
    } else {
      logger.info(`✅ ${successCount} migration(s) SQL appliquée(s) avec succès`);
    }
  } catch (error) {
    logger.error('❌ Erreur lors de l\'exécution des migrations SQL:', error);
    throw error;
  }
}

module.exports = migrateAllSQL;

// Si exécuté directement (node migrateAllSQL.js)
if (require.main === module) {
  (async () => {
    try {
      await migrateAllSQL();
      process.exit(0);
    } catch (error) {
      logger.error('Erreur:', error);
      process.exit(1);
    }
  })();
}
