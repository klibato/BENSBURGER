const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User, Organization } = require('../models');
const logger = require('../utils/logger');
const { hasPermission, hasAnyPermission } = require('../config/permissions');

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  try {
    // Sécurité NF525: Lire le token depuis le cookie httpOnly (prioritaire)
    // Sinon, fallback sur Authorization header (rétrocompatibilité)
    let token = req.cookies?.token; // Cookie httpOnly (sécurisé)

    if (!token) {
      // Fallback: Authorization header (ancien système, moins sécurisé)
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    }

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

    // MULTI-TENANT: Injecter organizationId depuis le user
    req.organizationId = user.organization_id;

    // MULTI-TENANT: Charger l'organisation complète
    const organization = await Organization.findByPk(user.organization_id);
    if (!organization) {
      logger.error(`Organization not found for user ${user.id} (org_id: ${user.organization_id})`);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organisation introuvable',
        },
      });
    }
    req.organization = organization;

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
    // Sécurité NF525: Lire le token depuis le cookie httpOnly (prioritaire)
    let token = req.cookies?.token;

    if (!token) {
      // Fallback: Authorization header (rétrocompatibilité)
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.userId);

      if (user && user.is_active) {
        req.user = user;
        // MULTI-TENANT: Injecter organizationId depuis le user
        req.organizationId = user.organization_id;
      }
    }
  } catch (error) {
    // Ignorer les erreurs et continuer sans utilisateur
    logger.debug('Erreur d\'authentification optionnelle:', error.message);
  }

  // MULTI-TENANT: Si pas d'auth, utiliser organisation par défaut (dev mode)
  if (!req.organizationId) {
    req.organizationId = 1; // FlexPOS par défaut
    logger.warn('No authentication - using default organization (id=1)');
  }

  // MULTI-TENANT: Charger l'organisation complète
  try {
    const organization = await Organization.findByPk(req.organizationId);
    if (organization) {
      req.organization = organization;
    } else {
      logger.warn(`Organization not found: ${req.organizationId}`);
    }
  } catch (error) {
    logger.error('Erreur lors du chargement de l\'organisation:', error);
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
