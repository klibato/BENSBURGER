const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesByCategory,
} = require('../controllers/dashboardController');
const { authenticateToken, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Récupérer les statistiques du dashboard
 * @access  Authentifié avec permission
 * @query   period - today|week|month|year
 */
router.get('/stats', requirePermission(PERMISSIONS.DASHBOARD_VIEW), getDashboardStats);

/**
 * @route   GET /api/dashboard/sales-by-category
 * @desc    Récupérer les ventes par catégorie
 * @access  Authentifié avec permission
 * @query   period - today|week|month|year
 */
router.get('/sales-by-category', requirePermission(PERMISSIONS.DASHBOARD_VIEW), getSalesByCategory);

module.exports = router;
