const express = require('express');
const router = express.Router();
const {
  getAllCashRegisters,
  getActiveCashRegister,
  openCashRegister,
  closeCashRegister,
  getCashRegisterById,
} = require('../controllers/cashRegisterController');
const { authenticateToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route   GET /api/cash-registers
 * @desc    Récupérer toutes les caisses
 * @access  Authentifié
 */
router.get('/', getAllCashRegisters);

/**
 * @route   GET /api/cash-registers/active
 * @desc    Récupérer la caisse active de l'utilisateur
 * @access  Authentifié
 */
router.get('/active', getActiveCashRegister);

/**
 * @route   POST /api/cash-registers/open
 * @desc    Ouvrir une nouvelle caisse
 * @access  Authentifié
 */
router.post('/open', openCashRegister);

/**
 * @route   POST /api/cash-registers/:id/close
 * @desc    Fermer une caisse
 * @access  Authentifié (propriétaire ou admin)
 */
router.post('/:id/close', closeCashRegister);

/**
 * @route   GET /api/cash-registers/:id
 * @desc    Récupérer une caisse par ID
 * @access  Authentifié (propriétaire ou admin)
 */
router.get('/:id', getCashRegisterById);

module.exports = router;
