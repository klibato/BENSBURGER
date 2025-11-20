const express = require('express');
const router = express.Router();
const nf525Controller = require('../controllers/nf525Controller');
const { authenticateToken, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

/**
 * Routes NF525 - Administration Conformité Fiscale
 * Conforme décret n°2016-1551 (anti-fraude TVA)
 *
 * IMPORTANT:
 * - Ces routes sont PROTÉGÉES et nécessitent une authentification admin
 * - Chaque organisation ne peut accéder QU'À SES PROPRES données NF525
 * - Isolation multi-tenant garantie par req.organizationId
 */

/**
 * @route   GET /api/nf525/verify-integrity
 * @desc    Vérifier l'intégrité de la chaîne de hash NF525
 * @access  Admin uniquement
 * @query   limit (optionnel) - Nombre d'entrées à vérifier (pagination)
 * @query   offset (optionnel) - Offset pour pagination
 *
 * Vérifie:
 * 1. Chaînage correct (previous_hash = current_hash précédent)
 * 2. Aucune altération des données (recalcul hash)
 * 3. Séquence continue (1, 2, 3... N)
 *
 * Exemple:
 * GET /api/nf525/verify-integrity?limit=1000&offset=0
 */
router.get(
  '/verify-integrity',
  authenticateToken,
  requirePermission(PERMISSIONS.ADMIN),
  nf525Controller.verifyIntegrity
);

/**
 * @route   GET /api/nf525/stats
 * @desc    Récupérer les statistiques NF525 de l'organisation
 * @access  Admin uniquement
 *
 * Retourne:
 * - Nombre total d'entrées hash_chain
 * - Première et dernière séquence
 * - Date première et dernière certification
 * - Statut global de conformité
 *
 * Exemple:
 * GET /api/nf525/stats
 */
router.get(
  '/stats',
  authenticateToken,
  requirePermission(PERMISSIONS.ADMIN),
  nf525Controller.getStats
);

/**
 * @route   GET /api/nf525/export
 * @desc    Exporter l'archive fiscale NF525
 * @access  Admin uniquement
 * @query   format (optionnel) - 'json' ou 'csv' (défaut: 'json')
 * @query   startDate (optionnel) - Date de début (ISO 8601)
 * @query   endDate (optionnel) - Date de fin (ISO 8601)
 *
 * Export conforme pour audit fiscal:
 * - Format JSON ou CSV
 * - Toutes les entrées hash_chain avec métadonnées
 * - Filtrage par période optionnel
 *
 * Exemples:
 * GET /api/nf525/export?format=json
 * GET /api/nf525/export?format=csv&startDate=2024-01-01&endDate=2024-12-31
 */
router.get(
  '/export',
  authenticateToken,
  requirePermission(PERMISSIONS.ADMIN),
  nf525Controller.exportArchive
);

module.exports = router;
