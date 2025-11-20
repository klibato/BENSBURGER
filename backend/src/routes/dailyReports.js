const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { authenticateToken, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// POST /api/daily-reports/generate - Générer un rapport Z
router.post(
  '/generate',
  requirePermission(PERMISSIONS.SETTINGS_VIEW), // Seuls admin/manager peuvent générer
  dailyReportController.generateDailyReport
);

// GET /api/daily-reports/export/csv - Exporter en CSV (doit être avant /:id)
router.get(
  '/export/csv',
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  dailyReportController.exportDailyReportsCSV
);

// GET /api/daily-reports/by-date/:date - Récupérer rapport par date
router.get(
  '/by-date/:date',
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  dailyReportController.getDailyReportByDate
);

// GET /api/daily-reports - Liste des rapports
router.get(
  '/',
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  dailyReportController.getAllDailyReports
);

// GET /api/daily-reports/:id - Détail d'un rapport
router.get(
  '/:id',
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  dailyReportController.getDailyReportById
);

module.exports = router;
