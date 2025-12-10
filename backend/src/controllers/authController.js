const jwt = require('jsonwebtoken');
const { User, Organization, Sale, CashRegister, AuditLog, RefreshToken, sequelize } = require('../models');
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

    // ✅ P1-6: Générer access token JWT (courte durée: 15 min)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id, // MULTI-TENANT: Important pour tenantIsolation
      },
      config.jwt.secret,
      { expiresIn: '15m' }, // ✅ P1-6: 15 minutes (au lieu de 8h)
    );

    // ✅ P1-6: Générer refresh token (longue durée: 7 jours)
    logger.info(`[DEBUG P1-6] Génération refresh token pour user ${user.id}, org ${user.organization_id}`);
    const refreshToken = await RefreshToken.generateToken(user.id, user.organization_id, 7);
    logger.info(`[DEBUG P1-6] Refresh token généré: ${refreshToken ? refreshToken.token.substring(0, 30) + '...' : 'ÉCHEC'}`);

    logger.info(`Utilisateur ${username} connecté`);

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'LOGIN', 'user', user.id, {
        username: user.username,
        role: user.role,
      });
    });

    // ✅ P1-6: Stocker access token dans cookie httpOnly (courte durée)
    res.cookie('token', accessToken, {
      httpOnly: true, // Inaccessible au JavaScript client (protection XSS)
      secure: config.env === 'production', // HTTPS uniquement en production
      sameSite: 'strict', // Protection CSRF
      maxAge: 15 * 60 * 1000, // ✅ P1-6: 15 minutes
    });

    // ✅ P1-6: Stocker refresh token dans cookie httpOnly séparé (longue durée)
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/auth/refresh', // Limite le cookie uniquement à l'endpoint refresh
    });

    // Sécurité: NE PAS envoyer les tokens dans la réponse JSON
    // Les cookies httpOnly sont suffisants et plus sécurisés (pas d'accès JavaScript)
    res.json({
      success: true,
      data: {
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

    // ✅ P1-6: Révoquer le refresh token si présent
    const refreshTokenValue = req.cookies.refreshToken;
    if (refreshTokenValue) {
      await RefreshToken.revoke(refreshTokenValue);
    }

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'LOGOUT', 'user', req.user.id, {
        username: req.user.username,
      });
    });

    // ✅ P1-6: Supprimer les cookies httpOnly (access token + refresh token)
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
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

    // ✅ P1-6: Révoquer l'ancien refresh token
    const oldRefreshToken = req.cookies.refreshToken;
    if (oldRefreshToken) {
      await RefreshToken.revoke(oldRefreshToken);
    }

    // ✅ P1-6: Générer nouveau access token JWT pour le nouveau caissier (courte durée: 15 min)
    const accessToken = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        organization_id: newUser.organization_id, // MULTI-TENANT: Important pour tenantIsolation
      },
      config.jwt.secret,
      { expiresIn: '15m' },
    );

    // ✅ P1-6: Générer nouveau refresh token (longue durée: 7 jours)
    const newRefreshToken = await RefreshToken.generateToken(newUser.id, newUser.organization_id, 7);

    logger.info(`Changement de caissier: ${req.user.username} -> ${newUser.username}`);

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'SWITCH_CASHIER', 'user', newUser.id, {
        old_user: req.user.username,
        new_user: newUser.username,
      });
    });

    // ✅ P1-6: Mettre à jour les cookies httpOnly avec les nouveaux tokens
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', newRefreshToken.token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/auth/refresh',
    });

    // Sécurité: NE PAS envoyer les tokens dans la réponse JSON
    res.json({
      success: true,
      data: {
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

    // ✅ P1-1: Générer PIN à 6 chiffres aléatoire (sécurité anti-brute-force)
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();

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

/**
 * RGPD Art. 15 - Droit d'accès aux données personnelles
 * GET /api/auth/user/data
 * Exporte toutes les données personnelles de l'utilisateur au format JSON
 */
const exportUserData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.organizationId;

    // Charger utilisateur avec toutes ses relations
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'slug', 'email', 'phone', 'plan', 'created_at'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable',
        },
      });
    }

    // Charger ventes créées par l'utilisateur
    const sales = await Sale.findAll({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
      attributes: ['id', 'ticket_number', 'total_ttc', 'payment_method', 'created_at', 'status'],
      limit: 1000, // Limiter pour éviter surcharge
    });

    // Charger caisses ouvertes par l'utilisateur
    const cashRegisters = await CashRegister.findAll({
      where: {
        opened_by: userId,
        organization_id: organizationId,
      },
      attributes: ['id', 'opened_at', 'closed_at', 'status', 'opening_balance', 'closing_balance'],
      limit: 100,
    });

    // Charger logs d'audit de l'utilisateur
    const auditLogs = await AuditLog.findAll({
      where: {
        user_id: userId,
      },
      attributes: ['id', 'action', 'entity_type', 'entity_id', 'ip_address', 'created_at'],
      limit: 500,
      order: [['created_at', 'DESC']],
    });

    // Construire export RGPD complet
    const exportData = {
      export_date: new Date().toISOString(),
      export_type: 'rgpd_article_15',
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        email: user.organization.email,
        phone: user.organization.phone,
        plan: user.organization.plan,
        created_at: user.organization.created_at,
      } : null,
      sales_count: sales.length,
      sales: sales.map(sale => ({
        id: sale.id,
        ticket_number: sale.ticket_number,
        total_ttc: parseFloat(sale.total_ttc),
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        status: sale.status,
      })),
      cash_registers_count: cashRegisters.length,
      cash_registers: cashRegisters.map(cr => ({
        id: cr.id,
        opened_at: cr.opened_at,
        closed_at: cr.closed_at,
        status: cr.status,
        opening_balance: cr.opening_balance ? parseFloat(cr.opening_balance) : null,
        closing_balance: cr.closing_balance ? parseFloat(cr.closing_balance) : null,
      })),
      audit_logs_count: auditLogs.length,
      audit_logs: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        ip_address: log.ip_address,
        created_at: log.created_at,
      })),
      gdpr_rights: {
        right_to_access: 'Exercé via cet export',
        right_to_rectification: 'Contactez votre administrateur pour modifier vos données',
        right_to_erasure: 'DELETE /api/auth/user/data pour supprimer définitivement',
        right_to_portability: 'Cet export JSON est portable vers d\'autres systèmes',
        right_to_object: 'Contactez support@flexpos.app',
      },
    };

    logger.info(`RGPD: User data export for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Export user data error:', error);
    next(error);
  }
};

/**
 * RGPD Art. 17 - Droit à l'effacement (droit à l'oubli)
 * DELETE /api/auth/user/data
 * Supprime définitivement le compte et toutes les données personnelles
 */
const deleteUserData = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const organizationId = req.organizationId;
    const { confirmation } = req.body;

    // Vérifier confirmation explicite
    if (confirmation !== 'DELETE_MY_DATA') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Veuillez confirmer la suppression en envoyant { "confirmation": "DELETE_MY_DATA" }',
        },
      });
    }

    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable',
        },
      });
    }

    // Vérifier si c'est le dernier admin de l'organisation
    if (user.role === 'admin') {
      const adminCount = await User.count({
        where: {
          organization_id: organizationId,
          role: 'admin',
          is_active: true,
        },
        transaction,
      });

      if (adminCount <= 1) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            code: 'LAST_ADMIN',
            message: 'Impossible de supprimer le dernier administrateur. Veuillez d\'abord créer un autre admin.',
          },
        });
      }
    }

    // Anonymiser les logs d'audit (conservation légale mais anonymisée)
    await AuditLog.update(
      {
        user_id: null,
        ip_address: '0.0.0.0',
        user_agent: 'ANONYMIZED',
        old_values: null,
        new_values: null,
      },
      {
        where: { user_id: userId },
        transaction,
      },
    );

    // Note: Les ventes sont conservées pour conformité NF525 (6 ans légal)
    // Mais le lien user_id reste pour traçabilité fiscale
    // L'utilisateur est supprimé, mais les transactions restent

    // Suppression définitive de l'utilisateur
    await user.destroy({ force: true, transaction }); // force: true = hard delete

    await transaction.commit();

    logger.info(`RGPD: User data deleted for user ID ${userId}`); // ✅ FIX: Ne pas logger l'email

    // Effacer le cookie de session
    res.clearCookie('token');

    return res.status(200).json({
      success: true,
      message: 'Vos données personnelles ont été supprimées définitivement. Votre compte n\'existe plus.',
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Delete user data error:', error);
    next(error);
  }
};

/**
 * ✅ P1-6: Refresh access token avec refresh token
 * POST /api/auth/refresh
 *
 * Permet de renouveler un access token expiré sans re-authentification
 * Nécessite un refresh token valide dans le cookie refreshToken
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;

    // Vérifier présence du refresh token
    if (!refreshTokenValue) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token requis',
        },
      });
    }

    // Vérifier validité du refresh token
    const refreshToken = await RefreshToken.isValid(refreshTokenValue);
    if (!refreshToken) {
      // Token invalide, expiré ou révoqué
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        path: '/api/auth/refresh',
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token invalide ou expiré. Veuillez vous reconnecter.',
        },
      });
    }

    // Charger l'utilisateur
    const user = await User.findByPk(refreshToken.user_id);
    if (!user || !user.is_active) {
      await RefreshToken.revoke(refreshTokenValue);
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable ou inactif',
        },
      });
    }

    // Générer un nouveau access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id,
      },
      config.jwt.secret,
      { expiresIn: '15m' },
    );

    // Mettre à jour le cookie access token
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    logger.debug(`Access token refreshed for user ${user.username}`);

    res.json({
      success: true,
      message: 'Access token renouvelé',
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
  signup,
  exportUserData,
  deleteUserData,
  refreshAccessToken, // ✅ P1-6: Refresh token endpoint
};
