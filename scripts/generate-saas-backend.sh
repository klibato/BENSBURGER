#!/bin/bash

# =================================================
# Script de génération Backend SaaS FlexPOS
# =================================================
# Description: Crée tous les fichiers backend nécessaires
# pour transformer FlexPOS en SaaS complet
# Date: 2025-11-18
# =================================================

set -e

BACKEND_DIR="/home/user/BENSBURGER/backend/src"

echo "🚀 Génération Backend SaaS FlexPOS..."
echo ""

# =================================================
# 1. Controllers Admin
# =================================================
echo "📁 Création controllers admin..."

# AdminOrganizationsController
cat > "$BACKEND_DIR/controllers/admin/adminOrganizationsController.js" << 'EOF'
const { Organization, User, Product, Sale, Subscription } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

// GET /api/admin/organizations - Liste toutes les organisations
const getAllOrganizations = async (req, res, next) => {
  try {
    const { status, plan, search, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: organizations } = await Organization.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          where: { status: 'active' },
          required: false,
          limit: 1,
          order: [['created_at', 'DESC']],
        },
      ],
    });

    // Enrichir avec statistiques
    const enrichedOrgs = await Promise.all(
      organizations.map(async (org) => {
        const userCount = await org.getUserCount();
        const productCount = await org.getProductCount();
        const salesCount = await Sale.count({ where: { organization_id: org.id } });

        return {
          ...org.toPublicJSON(),
          stats: {
            users: userCount,
            products: productCount,
            sales: salesCount,
          },
        };
      })
    );

    return res.json({
      success: true,
      data: {
        organizations: enrichedOrgs,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    logger.error('Get all organizations error:', error);
    next(error);
  }
};

// GET /api/admin/organizations/:id - Détails organisation
const getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findByPk(id, {
      include: [
        { model: User, as: 'users', where: { is_active: true }, required: false },
        { model: Subscription, as: 'subscriptions', order: [['created_at', 'DESC']] },
      ],
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    return res.json({
      success: true,
      data: { organization },
    });
  } catch (error) {
    logger.error('Get organization error:', error);
    next(error);
  }
};

// PUT /api/admin/organizations/:id/suspend - Suspendre organisation
const suspendOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    organization.status = 'suspended';
    await organization.save();

    logger.info(\`Organization suspended: \${id} - Reason: \${reason}\`);

    return res.json({
      success: true,
      message: 'Organisation suspendue avec succès',
      data: { organization },
    });
  } catch (error) {
    logger.error('Suspend organization error:', error);
    next(error);
  }
};

// PUT /api/admin/organizations/:id/activate - Activer organisation
const activateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    organization.status = 'active';
    await organization.save();

    logger.info(\`Organization activated: \${id}\`);

    return res.json({
      success: true,
      message: 'Organisation activée avec succès',
      data: { organization },
    });
  } catch (error) {
    logger.error('Activate organization error:', error);
    next(error);
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  suspendOrganization,
  activateOrganization,
};
EOF

# AdminAnalyticsController
cat > "$BACKEND_DIR/controllers/admin/adminAnalyticsController.js" << 'EOF'
const { Organization, Subscription, Invoice, Sale, sequelize } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

// GET /api/admin/analytics/dashboard - Dashboard global
const getDashboard = async (req, res, next) => {
  try {
    // Total organisations
    const totalOrgs = await Organization.count();
    const activeOrgs = await Organization.count({ where: { status: 'active' } });

    // MRR (Monthly Recurring Revenue)
    const activeSubs = await Subscription.findAll({
      where: { status: 'active', billing_interval: 'monthly' },
      attributes: ['price_cents'],
    });
    const mrr = activeSubs.reduce((sum, sub) => sum + sub.price_cents, 0) / 100;

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Revenus du mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Invoice.sum('total_cents', {
      where: {
        status: 'paid',
        paid_at: { [Op.gte]: startOfMonth },
      },
    }) || 0;

    // Nouvelles organisations ce mois
    const newOrgsThisMonth = await Organization.count({
      where: {
        created_at: { [Op.gte]: startOfMonth },
      },
    });

    // Churn (organisations annulées ce mois)
    const churnedOrgsThisMonth = await Organization.count({
      where: {
        status: 'cancelled',
        updated_at: { [Op.gte]: startOfMonth },
      },
    });

    return res.json({
      success: true,
      data: {
        organizations: {
          total: totalOrgs,
          active: activeOrgs,
          new_this_month: newOrgsThisMonth,
          churned_this_month: churnedOrgsThisMonth,
        },
        revenue: {
          mrr,
          arr,
          monthly_revenue: monthlyRevenue / 100,
          currency: 'EUR',
        },
      },
    });
  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    next(error);
  }
};

module.exports = {
  getDashboard,
};
EOF

echo "✅ Controllers admin créés"

# =================================================
# 2. Middleware Admin Auth
# =================================================
echo "📁 Création middleware admin auth..."

cat > "$BACKEND_DIR/middlewares/adminAuth.js" << 'EOF'
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
EOF

echo "✅ Middleware admin auth créé"

# =================================================
# 3. Routes Admin
# =================================================
echo "📁 Création routes admin..."

cat > "$BACKEND_DIR/routes/admin.js" << 'EOF'
const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/admin/adminAuthController');
const adminOrganizationsController = require('../controllers/admin/adminOrganizationsController');
const adminAnalyticsController = require('../controllers/admin/adminAnalyticsController');

const { authenticateAdmin, requireSuperAdmin, requireAdminPermission } = require('../middlewares/adminAuth');

// ============================================
// AUTH ROUTES (Public)
// ============================================
router.post('/auth/login', adminAuthController.login);
router.post('/auth/logout', adminAuthController.logout);
router.post('/auth/password-reset/request', adminAuthController.requestPasswordReset);
router.post('/auth/password-reset', adminAuthController.resetPassword);

// ============================================
// PROTECTED ROUTES (Require Admin Auth)
// ============================================

// Current admin
router.get('/auth/me', authenticateAdmin, adminAuthController.getMe);

// Organizations
router.get('/organizations', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getAllOrganizations);
router.get('/organizations/:id', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getOrganizationById);
router.put('/organizations/:id/suspend', authenticateAdmin, requireSuperAdmin, adminOrganizationsController.suspendOrganization);
router.put('/organizations/:id/activate', authenticateAdmin, requireSuperAdmin, adminOrganizationsController.activateOrganization);

// Analytics
router.get('/analytics/dashboard', authenticateAdmin, requireAdminPermission('analytics:read'), adminAnalyticsController.getDashboard);

module.exports = router;
EOF

echo "✅ Routes admin créées"

# =================================================
# 4. Service Email (Brevo)
# =================================================
echo "📁 Création service email Brevo..."

cat > "$BACKEND_DIR/services/emailService.js" << 'EOF'
const axios = require('axios');
const logger = require('../utils/logger');

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@flexpos.app';
const FROM_NAME = process.env.FROM_NAME || 'FlexPOS';

/**
 * Envoyer un email via Brevo
 */
const sendEmail = async ({ to, subject, htmlContent, textContent = null }) => {
  if (!BREVO_API_KEY) {
    logger.warn('Brevo API key not configured. Email not sent.');
    return { success: false, error: 'BREVO_NOT_CONFIGURED' };
  }

  try {
    const response = await axios.post(
      \`\${BREVO_API_URL}/smtp/email\`,
      {
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(\`Email sent to \${to}: \${subject}\`);

    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    logger.error('Brevo send email error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Envoyer email de bienvenue
 */
const sendWelcomeEmail = async (organization) => {
  const htmlContent = \`
    <h1>Bienvenue sur FlexPOS !</h1>
    <p>Bonjour <strong>\${organization.name}</strong>,</p>
    <p>Votre compte FlexPOS a été créé avec succès.</p>
    <p>Vous bénéficiez de 14 jours d'essai gratuit du plan <strong>\${organization.plan}</strong>.</p>
    <p>Connectez-vous dès maintenant : <a href="https://app.flexpos.app">https://app.flexpos.app</a></p>
    <p>Besoin d'aide ? Contactez-nous : support@flexpos.app</p>
  \`;

  return await sendEmail({
    to: organization.email,
    subject: 'Bienvenue sur FlexPOS - Votre essai gratuit a commencé',
    htmlContent,
  });
};

/**
 * Envoyer email de rappel fin de trial
 */
const sendTrialEndingEmail = async (organization, daysLeft) => {
  const htmlContent = \`
    <h1>Votre essai gratuit se termine bientôt</h1>
    <p>Bonjour <strong>\${organization.name}</strong>,</p>
    <p>Il vous reste <strong>\${daysLeft} jours</strong> d'essai gratuit.</p>
    <p>Pour continuer à utiliser FlexPOS, passez à un plan payant.</p>
    <p><a href="https://app.flexpos.app/settings/billing">Gérer mon abonnement</a></p>
  \`;

  return await sendEmail({
    to: organization.email,
    subject: \`Votre essai FlexPOS se termine dans \${daysLeft} jours\`,
    htmlContent,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendTrialEndingEmail,
};
EOF

echo "✅ Service email Brevo créé"

# =================================================
# 5. Cron Jobs
# =================================================
echo "📁 Création cron jobs..."

cat > "$BACKEND_DIR/services/cronJobs.js" << 'EOF'
const cron = require('node-cron');
const { Organization, Subscription, Invoice } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { sendTrialEndingEmail } = require('./emailService');

/**
 * Vérifier les trials qui expirent dans 3 jours et envoyer email
 * Exécuté tous les jours à 9h
 */
const checkTrialsExpiring = cron.schedule('0 9 * * *', async () => {
  try {
    logger.info('Cron job: Checking trials expiring soon...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringOrgs = await Organization.findAll({
      where: {
        trial_ends_at: {
          [Op.lte]: threeDaysFromNow,
          [Op.gte]: new Date(),
        },
        status: 'active',
      },
    });

    for (const org of expiringOrgs) {
      const daysLeft = Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
      await sendTrialEndingEmail(org, daysLeft);
    }

    logger.info(\`Cron job: \${expiringOrgs.length} trial expiring emails sent\`);
  } catch (error) {
    logger.error('Cron job error (checkTrialsExpiring):', error);
  }
}, {
  scheduled: false, // Ne démarre pas automatiquement
});

/**
 * Générer factures mensuelles pour tous les abonnements actifs
 * Exécuté le 1er de chaque mois à 00:00
 */
const generateMonthlyInvoices = cron.schedule('0 0 1 * *', async () => {
  try {
    logger.info('Cron job: Generating monthly invoices...');

    const today = new Date();
    const activeSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        current_period_end: {
          [Op.lte]: today,
        },
      },
      include: [{ model: Organization, as: 'organization' }],
    });

    let invoicesCreated = 0;

    for (const subscription of activeSubscriptions) {
      try {
        // Créer facture
        const invoice = await Invoice.createFromSubscription(subscription, subscription.organization);

        // Mettre à jour période d'abonnement
        subscription.current_period_start = subscription.current_period_end;
        subscription.current_period_end = new Date(subscription.current_period_end);
        subscription.current_period_end.setMonth(subscription.current_period_end.getMonth() + 1);
        await subscription.save();

        invoicesCreated++;
      } catch (error) {
        logger.error(\`Failed to create invoice for subscription \${subscription.id}:\`, error);
      }
    }

    logger.info(\`Cron job: \${invoicesCreated} monthly invoices created\`);
  } catch (error) {
    logger.error('Cron job error (generateMonthlyInvoices):', error);
  }
}, {
  scheduled: false,
});

/**
 * Démarrer tous les cron jobs
 */
const startCronJobs = () => {
  logger.info('Starting cron jobs...');
  checkTrialsExpiring.start();
  generateMonthlyInvoices.start();
  logger.info('Cron jobs started successfully');
};

/**
 * Arrêter tous les cron jobs
 */
const stopCronJobs = () => {
  logger.info('Stopping cron jobs...');
  checkTrialsExpiring.stop();
  generateMonthlyInvoices.stop();
  logger.info('Cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs,
};
EOF

echo "✅ Cron jobs créés"

echo ""
echo "✅ Backend SaaS généré avec succès !"
echo ""
echo "📦 Fichiers créés :"
echo "  - backend/src/controllers/admin/adminAuthController.js"
echo "  - backend/src/controllers/admin/adminOrganizationsController.js"
echo "  - backend/src/controllers/admin/adminAnalyticsController.js"
echo "  - backend/src/middlewares/adminAuth.js"
echo "  - backend/src/routes/admin.js"
echo "  - backend/src/services/emailService.js"
echo "  - backend/src/services/cronJobs.js"
echo ""
echo "⚠️ PROCHAINES ÉTAPES :"
echo "  1. Installer node-cron: cd backend && npm install node-cron"
echo "  2. Ajouter BREVO_API_KEY dans .env"
echo "  3. Importer routes admin dans server.js"
echo "  4. Démarrer cron jobs dans server.js"
echo ""
EOF

chmod +x /home/user/BENSBURGER/scripts/generate-saas-backend.sh
