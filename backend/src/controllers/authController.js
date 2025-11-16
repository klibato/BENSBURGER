const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/env');
const logger = require('../utils/logger');
const { getRolePermissions } = require('../config/permissions');
const { logAction } = require('../middleware/audit');

/**
 * Login avec username et PIN code
 */
const login = async (req, res, next) => {
  try {
    const { username, pin_code } = req.body;

    // Validation
    if (!username || !pin_code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username et PIN code requis',
        },
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants invalides',
        },
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Compte désactivé',
        },
      });
    }

    // Vérifier le PIN code
    const isValidPin = await user.validatePinCode(pin_code);

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants invalides',
        },
      });
    }

    // Générer le token JWT (MULTI-TENANT: inclure organization_id)
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id, // MULTI-TENANT: Important pour tenantIsolation
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration }
    );

    logger.info(`Utilisateur ${username} connecté`);

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'LOGIN', 'user', user.id, {
        username: user.username,
        role: user.role,
      });
    });

    res.json({
      success: true,
      data: {
        token,
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout (côté client principalement)
 */
const logout = async (req, res, next) => {
  try {
    logger.info(`Utilisateur ${req.user.username} déconnecté`);

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'LOGOUT', 'user', req.user.id, {
        username: req.user.username,
      });
    });

    res.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer l'utilisateur connecté
 */
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les permissions de l'utilisateur connecté
 */
const getPermissions = async (req, res, next) => {
  try {
    const permissions = getRolePermissions(req.user.role);

    res.json({
      success: true,
      data: {
        role: req.user.role,
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer de caissier rapidement (sans rate limiting strict)
 * Nécessite d'être déjà authentifié
 */
const switchCashier = async (req, res, next) => {
  try {
    const { username, pin_code } = req.body;

    // Validation
    if (!username || !pin_code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username et PIN code requis',
        },
      });
    }

    // Trouver le nouvel utilisateur
    const newUser = await User.findOne({ where: { username } });

    if (!newUser) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants invalides',
        },
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!newUser.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Compte désactivé',
        },
      });
    }

    // Vérifier le PIN code
    const isValidPin = await newUser.validatePinCode(pin_code);

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants invalides',
        },
      });
    }

    // Générer un nouveau token JWT pour le nouveau caissier
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, role: newUser.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration }
    );

    logger.info(`Changement de caissier: ${req.user.username} -> ${newUser.username}`);

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'SWITCH_CASHIER', 'user', newUser.id, {
        old_user: req.user.username,
        new_user: newUser.username,
      });
    });

    res.json({
      success: true,
      data: {
        token,
        user: newUser.toPublicJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  getPermissions,
  switchCashier,
};
