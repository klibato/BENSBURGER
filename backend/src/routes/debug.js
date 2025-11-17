/**
 * Routes de debug (à utiliser uniquement en développement)
 * IMPORTANT: Ces routes doivent être désactivées en production
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const config = require('../config/env');

// Middleware pour autoriser seulement en développement
const devOnly = (req, res, next) => {
  if (config.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Routes de debug désactivées en production',
      },
    });
  }
  next();
};

/**
 * POST /api/debug/cleanup-migration-016
 * Nettoie et réinitialise la migration 016 (NF525) pour retry
 */
router.post('/cleanup-migration-016', devOnly, async (req, res, next) => {
  try {
    logger.info('🧹 Cleanup migration 016 demandé via API');

    // Lire le script SQL de cleanup
    const cleanupPath = path.join(__dirname, '../../../database/migrations/016_cleanup_and_retry.sql');
    const cleanupSQL = fs.readFileSync(cleanupPath, 'utf8');

    // Exécuter le cleanup
    await sequelize.query(cleanupSQL, { raw: true });

    logger.info('✅ Cleanup migration 016 terminé avec succès');

    res.json({
      success: true,
      message: 'Migration 016 nettoyée avec succès',
      next_step: 'Redémarrez le serveur pour ré-exécuter la migration automatiquement',
    });
  } catch (error) {
    logger.error('❌ Erreur lors du cleanup migration 016:', error);
    next(error);
  }
});

module.exports = router;
