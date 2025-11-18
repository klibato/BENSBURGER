const jwt = require('jsonwebtoken');
const { AdminUser } = require('../models');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Middleware: Authentifier un super-admin via JWT
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Récupérer le token depuis le cookie ou le header
    const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Token d\'authentification manquant',
        },
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Type de token invalide',
        },
      });
    }

    // Charger l'admin depuis la BDD
    const admin = await AdminUser.findByPk(decoded.adminId);

    if (!admin || !admin.isActiveAndVerified()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_ADMIN',
          message: 'Administrateur invalide ou inactif',
        },
      });
    }

    // Attacher l'admin à la requête
    req.admin = admin;
    req.adminId = admin.id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expiré',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide',
        },
      });
    }

    logger.error('Admin auth middleware error:', error);
    next(error);
  }
};

/**
 * Middleware: Vérifier une permission spécifique
 */
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Non authentifié',
        },
      });
    }

    if (!req.admin.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: \`Permission requise: \${permission}\`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware: Vérifier rôle super_admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Accès réservé aux super-administrateurs',
      },
    });
  }

  next();
};

module.exports = {
  authenticateAdmin,
  requireAdminPermission,
  requireSuperAdmin,
};
