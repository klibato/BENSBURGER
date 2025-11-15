const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/logs
 * @desc    Récupérer tous les logs d'audit avec filtres
 * @access  Admin only
 * @query   start_date, end_date, user_id, action, entity_type, limit, offset
 */
router.get('/', logsController.getAllLogs);

/**
 * @route   GET /api/logs/stats
 * @desc    Récupérer les statistiques des logs
 * @access  Admin only
 * @query   start_date, end_date
 */
router.get('/stats', logsController.getLogsStats);

/**
 * @route   GET /api/logs/export
 * @desc    Exporter les logs en CSV
 * @access  Admin only
 * @query   start_date, end_date, user_id, action, entity_type
 */
router.get('/export', logsController.exportLogsCSV);

module.exports = router;
