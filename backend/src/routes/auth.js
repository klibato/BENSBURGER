const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

// Rate limiting strict pour le login (protection brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
    },
  },
  validate: { trustProxy: false }, // Désactiver validation trust proxy (reverse proxy Caddy)
});

// Rate limiting pour le signup (anti-spam)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 inscriptions par IP par heure
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives d\'inscription, réessayez plus tard',
    },
  },
  validate: { trustProxy: false },
});

// POST /api/auth/signup - Inscription nouvelle organisation (publique)
router.post('/signup', signupLimiter, authController.signup);

// POST /api/auth/login - Connexion (avec rate limiting strict)
router.post('/login', loginLimiter, authController.login);

// POST /api/auth/logout - Déconnexion
router.post('/logout', authenticateToken, authController.logout);

// POST /api/auth/switch-cashier - Changer de caissier rapidement (authentifié)
router.post('/switch-cashier', authenticateToken, authController.switchCashier);

// GET /api/auth/me - Utilisateur connecté
router.get('/me', authenticateToken, authController.getMe);

// GET /api/auth/permissions - Permissions de l'utilisateur connecté
router.get('/permissions', authenticateToken, authController.getPermissions);

module.exports = router;
