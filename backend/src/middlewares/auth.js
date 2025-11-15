const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../models');
const logger = require('../utils/logger');
const { hasPermission, hasAnyPermission } = require('../config/permissions');

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token manquant',
        },
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Récupérer l'utilisateur
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Utilisateur invalide ou inactif',
        },
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    logger.error('Erreur d\'authentification:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token invalide',
        },
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token expiré',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de l\'authentification',
      },
    });
  }
};

// Middleware d'authentification optionnelle (n'empêche pas l'accès)
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.userId);

      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignorer les erreurs et continuer sans utilisateur
    logger.debug('Erreur d\'authentification optionnelle:', error.message);
  }

  next();
};

// Middleware pour vérifier le rôle (admin only)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentification requise',
      },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Accès réservé aux administrateurs',
      },
    });
  }
  next();
};

/**
 * Middleware pour vérifier une permission spécifique
 * @param {string} permission - La permission requise
 * @returns {Function} Middleware Express
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentification requise',
        },
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      logger.warn(
        `User ${req.user.id} (${req.user.role}) denied access: missing permission ${permission}`
      );
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Permission insuffisante',
        },
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier au moins une des permissions
 * @param {Array<string>} permissions - Les permissions (OR)
 * @returns {Function} Middleware Express
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentification requise',
        },
      });
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      logger.warn(
        `User ${req.user.id} (${req.user.role}) denied access: missing any of ${permissions.join(', ')}`
      );
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Permission insuffisante',
        },
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuthenticate,
  requireAdmin,
  requirePermission,
  requireAnyPermission,
};
