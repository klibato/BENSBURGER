const jwt = require('jsonwebtoken');
const { AdminUser } = require('../../models');
const config = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * Login super-admin avec email/username + password
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier = email ou username

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email/username et mot de passe requis',
        },
      });
    }

    // Trouver admin par email ou username
    const admin = await AdminUser.findByIdentifier(identifier);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants invalides',
        },
      });
    }

    // Vérifier si le compte est actif
    if (!admin.isActiveAndVerified()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Compte inactif ou email non vérifié',
        },
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await admin.verifyPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Identifiants invalides',
        },
      });
    }

    // Enregistrer la connexion
    await admin.recordLogin(req.ip || req.connection.remoteAddress);

    // Générer JWT
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        type: 'admin', // Distinguer des users normaux
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    // Définir cookie httpOnly
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8h
    });

    logger.info(`Admin login successful: ${admin.email} (ID: ${admin.id})`);

    // Sécurité: NE PAS envoyer le token dans la réponse JSON
    // Le cookie httpOnly est suffisant et plus sécurisé
    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        admin: admin.toPublicJSON(),
      },
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    next(error);
  }
};

/**
 * Logout super-admin
 */
const logout = async (req, res, next) => {
  try {
    res.clearCookie('admin_token');

    logger.info(`Admin logout: ${req.admin?.email || 'Unknown'}`);

    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    logger.error('Admin logout error:', error);
    next(error);
  }
};

/**
 * Obtenir l'admin actuellement connecté
 */
const getMe = async (req, res, next) => {
  try {
    const admin = await AdminUser.findByPk(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Administrateur introuvable',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        admin: admin.toPublicJSON(),
      },
    });
  } catch (error) {
    logger.error('Get me error:', error);
    next(error);
  }
};

/**
 * Demander une réinitialisation de mot de passe
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email requis',
        },
      });
    }

    const admin = await AdminUser.findOne({ where: { email } });

    // Ne pas révéler si l'email existe ou non (sécurité)
    if (!admin) {
      return res.status(200).json({
        success: true,
        message: 'Si l\'email existe, un lien de réinitialisation a été envoyé',
      });
    }

    // Générer token de réinitialisation
    const resetToken = await admin.generateResetToken();

    // TODO: Envoyer email avec Brevo (à implémenter)
    logger.info(`Password reset requested for admin: ${email}. Token: ${resetToken}`);

    return res.status(200).json({
      success: true,
      message: 'Si l\'email existe, un lien de réinitialisation a été envoyé',
    });
  } catch (error) {
    logger.error('Request password reset error:', error);
    next(error);
  }
};

/**
 * Réinitialiser le mot de passe avec le token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token et nouveau mot de passe requis',
        },
      });
    }

    // Valider la force du mot de passe
    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Le mot de passe doit contenir au moins 8 caractères',
        },
      });
    }

    // Trouver admin avec ce token
    const admin = await AdminUser.findOne({
      where: {
        reset_token: token,
      },
    });

    if (!admin || !admin.isResetTokenValid(token)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide ou expiré',
        },
      });
    }

    // Réinitialiser le mot de passe
    await admin.resetPasswordWithToken(token, new_password);

    logger.info(`Password reset successful for admin: ${admin.email}`);

    return res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  requestPasswordReset,
  resetPassword,
};
