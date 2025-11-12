const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateToken, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// POST /api/sales - Créer une vente
router.post('/', requirePermission(PERMISSIONS.SALES_CREATE), saleController.createSale);

// GET /api/sales - Récupérer toutes les ventes
router.get('/', requirePermission(PERMISSIONS.SALES_VIEW), saleController.getAllSales);

// GET /api/sales/export/csv - Exporter les ventes en CSV
router.get('/export/csv', requirePermission(PERMISSIONS.SALES_VIEW), saleController.exportSalesCSV);

// GET /api/sales/:id - Récupérer une vente
router.get('/:id', requirePermission(PERMISSIONS.SALES_VIEW), saleController.getSaleById);

// GET /api/sales/:id/pdf - Générer le PDF du ticket
router.get('/:id/pdf', requirePermission(PERMISSIONS.SALES_VIEW), saleController.generateTicketPDFEndpoint);

module.exports = router;
