const { Organization, User, Subscription, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { sendWelcomeEmail } = require('../services/emailService');

/**
 * Inscription publique d'une nouvelle organisation
 * POST /api/public/signup
 */
const signup = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      organization_name,
      email,
      phone,
      first_name,
      last_name,
      password, // Pour le compte admin de l'organisation
    } = req.body;

    // Validation
    if (!organization_name || !email || !password) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nom organisation, email et mot de passe requis',
        },
      });
    }

    // Vérifier si email déjà utilisé
    const existingOrg = await Organization.findOne({ where: { email } });
    if (existingOrg) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Un compte existe déjà avec cet email',
        },
      });
    }

    // Générer slug unique depuis le nom
    let slug = organization_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Vérifier unicité du slug
    let slugExists = await Organization.findOne({ where: { slug } });
    let slugSuffix = 1;
    while (slugExists) {
      slug = `${slug}-${slugSuffix}`;
      slugExists = await Organization.findOne({ where: { slug } });
      slugSuffix++;
    }

    // 1. Créer l'organisation
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 jours de trial

    const organization = await Organization.create({
      name: organization_name,
      slug,
      email,
      phone: phone || null,
      plan: 'free', // Commence avec le plan gratuit
      status: 'active',
      trial_ends_at: trialEndsAt,
      max_users: 3, // Limites du plan free
      max_products: 50,
      settings: {
        store_name: organization_name,
        currency: 'EUR',
        currency_symbol: '€',
        language: 'fr-FR',
        timezone: 'Europe/Paris',
      },
    }, { transaction });

    // 2. Créer l'utilisateur admin pour cette organisation
    const hashedPassword = await bcrypt.hash(password, 10);

    // Générer un username unique
    let username = (first_name || 'admin').toLowerCase();
    let usernameExists = await User.findOne({ where: { username, organization_id: organization.id } });
    let usernameSuffix = 1;
    while (usernameExists) {
      username = `${username}${usernameSuffix}`;
      usernameExists = await User.findOne({ where: { username, organization_id: organization.id } });
      usernameSuffix++;
    }

    // PIN par défaut (sera hashé automatiquement par le hook beforeCreate du modèle User)
    const adminUser = await User.create({
      organization_id: organization.id,
      username,
      password_hash: hashedPassword,
      pin_code: '1234', // PIN par défaut : 1234 (sera hashé par le hook)
      first_name: first_name || 'Admin',
      last_name: last_name || '',
      role: 'admin',
      email,
      is_active: true,
      permissions: JSON.stringify([
        'products:read',
        'products:write',
        'sales:read',
        'sales:write',
        'users:read',
        'users:write',
        'settings:read',
        'settings:write',
        'cash_register:read',
        'cash_register:write',
        'dashboard:read',
      ]),
    }, { transaction });

    // 3. Créer l'abonnement (trial)
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(trialEndsAt);

    const subscription = await Subscription.create({
      organization_id: organization.id,
      plan: 'free',
      status: 'trialing',
      price_cents: 0, // Gratuit pendant le trial
      currency: 'EUR',
      billing_interval: 'monthly',
      started_at: currentPeriodStart,
      trial_ends_at: trialEndsAt,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // 4. Envoyer email de bienvenue (asynchrone, ne bloque pas la réponse)
    setImmediate(async () => {
      try {
        await sendWelcomeEmail(organization);
      } catch (error) {
        logger.error('Erreur envoi email bienvenue:', error);
      }
    });

    logger.info(`New organization signed up: ${organization.name} (${organization.id})`);

    // 5. Retourner les infos de connexion
    return res.status(201).json({
      success: true,
      message: 'Inscription réussie ! Bienvenue sur FlexPOS.',
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          email: organization.email,
          plan: organization.plan,
          trial_ends_at: organization.trial_ends_at,
        },
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
          default_pin: '1234', // Informer l'utilisateur du PIN par défaut
        },
        login_url: `https://app.flexpos.app`,
        trial_days: 14,
        next_steps: [
          'Connectez-vous avec votre username et PIN (1234)',
          'Configurez vos produits dans Paramètres > Produits',
          'Créez vos utilisateurs caissiers',
          'Ouvrez votre caisse et commencez à vendre !',
        ],
      },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Signup error:', error);
    next(error);
  }
};

/**
 * Vérifier disponibilité d'un slug
 * GET /api/public/check-slug?slug=mon-restaurant
 */
const checkSlugAvailability = async (req, res, next) => {
  try {
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Slug requis',
        },
      });
    }

    // Normaliser le slug
    const normalizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-|-$/g, '');

    const exists = await Organization.findOne({ where: { slug: normalizedSlug } });

    return res.json({
      success: true,
      data: {
        slug: normalizedSlug,
        available: !exists,
      },
    });
  } catch (error) {
    logger.error('Check slug error:', error);
    next(error);
  }
};

module.exports = {
  signup,
  checkSlugAvailability,
};
