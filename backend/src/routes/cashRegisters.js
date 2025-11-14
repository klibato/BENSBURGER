const express = require('express');
const router = express.Router();
const {
  getAllCashRegisters,
  getActiveCashRegister,
  openCashRegister,
  closeCashRegister,
  getCashRegisterById,
  exportCashRegistersCSV,
} = require('../controllers/cashRegisterController');
const { authenticateToken, requireAnyPermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route   GET /api/cash-registers
 * @desc    Récupérer toutes les caisses
 * @access  Authentifié avec permission
 */
router.get('/', requireAnyPermission([PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_VIEW_ALL]), getAllCashRegisters);

/**
 * @route   GET /api/cash-registers/active
 * @desc    Récupérer la caisse active de l'utilisateur
 * @access  Authentifié avec permission
 */
router.get('/active', requireAnyPermission([PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_VIEW_ALL]), getActiveCashRegister);

/**
 * @route   GET /api/cash-registers/export/csv
 * @desc    Exporter les clôtures de caisse en CSV
 * @access  Authentifié avec permission
 */
router.get('/export/csv', requireAnyPermission([PERMISSIONS.CASH_REGISTER_VIEW_ALL]), exportCashRegistersCSV);

/**
 * @route   POST /api/cash-registers/open
 * @desc    Ouvrir une nouvelle caisse
 * @access  Authentifié avec permission
 */
router.post('/open', requireAnyPermission([PERMISSIONS.CASH_REGISTER_OPEN]), openCashRegister);

/**
 * @route   POST /api/cash-registers/:id/close
 * @desc    Fermer une caisse
 * @access  Authentifié avec permission (propriétaire ou admin)
 */
router.post('/:id/close', requireAnyPermission([PERMISSIONS.CASH_REGISTER_CLOSE]), closeCashRegister);

/**
 * @route   GET /api/cash-registers/:id
 * @desc    Récupérer une caisse par ID
 * @access  Authentifié avec permission (propriétaire ou admin)
 */
router.get('/:id', requireAnyPermission([PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_VIEW_ALL]), getCashRegisterById);

module.exports = router;
