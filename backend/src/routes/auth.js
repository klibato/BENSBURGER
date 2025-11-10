const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

// POST /api/auth/login - Connexion
router.post('/login', authController.login);

// POST /api/auth/logout - Déconnexion
router.post('/logout', authenticateToken, authController.logout);

// GET /api/auth/me - Utilisateur connecté
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
