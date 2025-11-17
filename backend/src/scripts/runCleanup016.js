#!/usr/bin/env node
/**
 * Script de cleanup pour réinitialiser la migration 016 (NF525)
 * Supprime les tables/fonctions partiellement créées et l'entrée migrations_history
 *
 * Usage: node src/scripts/runCleanup016.js
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function runCleanup016() {
  try {
    logger.info('🧹 Démarrage cleanup migration 016...');

    // Lire le script SQL de cleanup
    const cleanupPath = path.join(__dirname, '../../../database/migrations/016_cleanup_and_retry.sql');
    const cleanupSQL = fs.readFileSync(cleanupPath, 'utf8');

    // Exécuter le cleanup
    await sequelize.query(cleanupSQL, { raw: true });

    logger.info('✅ Cleanup migration 016 terminé avec succès');
    logger.info('📝 La migration 016 sera automatiquement ré-exécutée au prochain démarrage du serveur');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erreur lors du cleanup migration 016:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runCleanup016();
}

module.exports = runCleanup016;
