const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/env');
const logger = require('../utils/logger');

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

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration }
    );

    logger.info(`Utilisateur ${username} connecté`);

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

module.exports = {
  login,
  logout,
  getMe,
};
