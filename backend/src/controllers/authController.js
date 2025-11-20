const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');
const config = require('../config/env');
const logger = require('../utils/logger');
const { getRolePermissions } = require('../config/permissions');
const { logAction } = require('../middlewares/audit');
const { sendEmail } = require('../services/emailService');

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

    // Sécurité NF525: Stocker le JWT dans un cookie httpOnly (protection XSS)
    // Au lieu de localStorage (vulnérable aux attaques XSS)
    res.cookie('token', token, {
      httpOnly: true, // Inaccessible au JavaScript client (protection XSS)
      secure: config.env === 'production', // HTTPS uniquement en production
      sameSite: 'strict', // Protection CSRF
      maxAge: 8 * 60 * 60 * 1000, // 8 heures (même durée que JWT)
    });

    res.json({
      success: true,
      data: {
        token, // On envoie quand même le token pour rétrocompatibilité (transition)
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

    // Sécurité NF525: Supprimer le cookie httpOnly
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
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

    // Générer un nouveau token JWT pour le nouveau caissier (MULTI-TENANT: inclure organization_id)
    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        organization_id: newUser.organization_id, // MULTI-TENANT: Important pour tenantIsolation
      },
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

    // Sécurité NF525: Mettre à jour le cookie httpOnly avec le nouveau token
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 heures
    });

    res.json({
      success: true,
      data: {
        token, // Rétrocompatibilité (transition)
        user: newUser.toPublicJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Signup - Créer une nouvelle organisation + utilisateur admin
 */
const signup = async (req, res, next) => {
  try {
    const { organizationName, contactEmail, contactName, phone } = req.body;

    // Validation
    if (!organizationName || !contactEmail || !contactName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nom de l\'établissement, email et nom de contact requis',
        },
      });
    }

    // Vérifier si l'email est déjà utilisé
    const existingOrg = await Organization.findOne({ where: { email: contactEmail } });
    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Un compte existe déjà avec cet email',
        },
      });
    }

    // Générer slug unique à partir du nom de l'organisation
    let slug = organizationName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever accents
      .replace(/[^a-z0-9]+/g, '-') // Remplacer espaces/caractères spéciaux par tirets
      .replace(/^-+|-+$/g, ''); // Enlever tirets début/fin

    // Vérifier unicité du slug et ajouter un nombre si nécessaire
    let slugExists = await Organization.findOne({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${slug}-${counter}`;
      slugExists = await Organization.findOne({ where: { slug } });
      counter++;
    }

    // Générer username unique (première lettre prénom + nom + nombre aléatoire)
    const nameParts = contactName.trim().split(' ');
    const firstName = nameParts[0] || 'user';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    let baseUsername = (firstName.charAt(0) + lastName)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    if (baseUsername.length < 3) {
      baseUsername = 'admin' + Math.floor(Math.random() * 1000);
    }

    // Vérifier unicité du username
    let username = baseUsername;
    let usernameExists = await User.findOne({ where: { username } });
    counter = Math.floor(Math.random() * 1000);
    while (usernameExists) {
      username = `${baseUsername}${counter}`;
      usernameExists = await User.findOne({ where: { username } });
      counter = Math.floor(Math.random() * 1000);
    }

    // Générer PIN à 4 chiffres aléatoire
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Créer l'organisation avec essai gratuit de 30 jours
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const organization = await Organization.create({
      name: organizationName,
      slug,
      email: contactEmail,
      phone: phone || null,
      plan: 'free',
      status: 'active',
      trial_ends_at: trialEndsAt,
      max_users: 3,
      max_products: 50,
    });

    // Créer l'utilisateur admin
    const user = await User.create({
      username,
      pin_code: pinCode, // Hook beforeCreate va le hasher automatiquement
      role: 'admin',
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: contactEmail,
      is_active: true,
      organization_id: organization.id,
    });

    logger.info(`Nouvelle inscription: ${organizationName} (${organization.slug}) - Admin: ${username}`);

    // Envoyer email avec identifiants
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #667eea; }
          .credential-value { font-size: 18px; font-family: monospace; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue sur FlexPOS!</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${contactName}</strong>,</p>

            <p>Votre compte FlexPOS pour <strong>${organizationName}</strong> a été créé avec succès!</p>

            <div class="credentials">
              <h3>🔐 Vos identifiants de connexion</h3>
              <div class="credential-item">
                <span class="credential-label">Nom d'utilisateur:</span><br>
                <span class="credential-value">${username}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Code PIN:</span><br>
                <span class="credential-value">${pinCode}</span>
              </div>
            </div>

            <p><strong>⚠️ Important:</strong> Conservez précieusement ces identifiants. Le code PIN ne pourra pas être récupéré.</p>

            <p>Vous bénéficiez de <strong>30 jours d'essai gratuit</strong> pour tester toutes les fonctionnalités de FlexPOS.</p>

            <div style="text-align: center;">
              <a href="https://app.flexpos.app/login" class="button">Se connecter maintenant</a>
            </div>

            <h3>✨ Prochaines étapes</h3>
            <ol>
              <li>Connectez-vous avec vos identifiants</li>
              <li>Configurez vos produits et catégories</li>
              <li>Ajoutez d'autres utilisateurs (caissiers)</li>
              <li>Commencez à vendre!</li>
            </ol>

            <p><strong>Besoin d'aide?</strong><br>
            Notre équipe support est là pour vous: <a href="mailto:support@flexpos.app">support@flexpos.app</a></p>
          </div>
          <div class="footer">
            <p>© 2024 FlexPOS - Solution de caisse moderne et conforme NF525</p>
            <p>Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: contactEmail,
      subject: '🎉 Bienvenue sur FlexPOS - Vos identifiants',
      htmlContent: emailHtml,
    });

    // Retourner succès
    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès. Vérifiez vos emails pour obtenir vos identifiants.',
      data: {
        organization: organization.toPublicJSON(),
      },
    });
  } catch (error) {
    logger.error('Erreur signup:', error);
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  getPermissions,
  switchCashier,
  signup,
};
