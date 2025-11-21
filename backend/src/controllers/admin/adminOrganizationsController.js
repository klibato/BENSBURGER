const { Organization, User, Product, Sale, Subscription, Invoice } = require('../../models');
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
    organization.suspension_reason = reason || 'Aucune raison fournie';
    await organization.save();

    logger.info(`Organization suspended: ${id} - Reason: ${reason}`);

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
    organization.suspension_reason = null; // Effacer la raison de suspension
    await organization.save();

    logger.info(`Organization activated: ${id}`);

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

// GET /api/admin/organizations/:id/sales - Voir les ventes d'une organisation
const getOrganizationSales = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0, start_date, end_date } = req.query;

    // Vérifier que l'organisation existe
    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    const where = { organization_id: id };

    // Filtres de date optionnels
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    const { count, rows: sales } = await Sale.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] },
      ],
    });

    // Calculer le total
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total_ttc || 0), 0);

    return res.json({
      success: true,
      data: {
        sales,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
        summary: {
          total_sales: count,
          total_amount: totalAmount,
        },
      },
    });
  } catch (error) {
    logger.error('Get organization sales error:', error);
    next(error);
  }
};

// GET /api/admin/organizations/:id/users - Voir les utilisateurs d'une organisation
const getOrganizationUsers = async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    const users = await User.findAll({
      where: { organization_id: id },
      order: [['created_at', 'DESC']],
    });

    return res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    logger.error('Get organization users error:', error);
    next(error);
  }
};

// PUT /api/admin/users/:id/password - Changer le mot de passe d'un utilisateur
const changeUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_pin_code } = req.body;

    if (!new_pin_code || new_pin_code.length < 4 || new_pin_code.length > 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Le code PIN doit contenir entre 4 et 6 chiffres' },
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' },
      });
    }

    // Le hook beforeUpdate va hasher automatiquement le nouveau PIN
    user.pin_code = new_pin_code;
    await user.save();

    logger.info(`Password changed for user ${id} by admin ${req.admin.id}`);

    return res.json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  } catch (error) {
    logger.error('Change user password error:', error);
    next(error);
  }
};

// GET /api/admin/invoices - Voir toutes les factures
const getAllInvoices = async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'email'] },
        { model: Subscription, as: 'subscription', attributes: ['id', 'plan', 'status'] },
      ],
    });

    return res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    logger.error('Get all invoices error:', error);
    next(error);
  }
};

// GET /api/admin/organizations/:id/invoices - Voir les factures d'une organisation
const getOrganizationInvoices = async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    const invoices = await Invoice.findAll({
      where: { organization_id: id },
      order: [['created_at', 'DESC']],
      include: [
        { model: Subscription, as: 'subscription', attributes: ['id', 'plan', 'status'] },
      ],
    });

    return res.json({
      success: true,
      data: { invoices },
    });
  } catch (error) {
    logger.error('Get organization invoices error:', error);
    next(error);
  }
};

// PUT /api/admin/organizations/:id/subscription - Gérer l'abonnement (upgrade/downgrade)
const updateOrganizationSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, billing_interval } = req.body;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organisation introuvable' },
      });
    }

    // Trouver l'abonnement actif
    const activeSubscription = await Subscription.findOne({
      where: {
        organization_id: id,
        status: { [Op.in]: ['active', 'trialing'] },
      },
      order: [['created_at', 'DESC']],
    });

    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'Aucun abonnement actif trouvé' },
      });
    }

    // Définir les prix par plan
    const planPrices = {
      starter: 2900, // 29€ en centimes
      pro: 8900, // 89€
      business: 19900, // 199€
      enterprise: 0, // Sur devis
    };

    if (plan) {
      activeSubscription.plan = plan;
      activeSubscription.price_cents = planPrices[plan] || activeSubscription.price_cents;
    }

    if (billing_interval) {
      activeSubscription.billing_interval = billing_interval;
    }

    await activeSubscription.save();

    logger.info(`Subscription updated for organization ${id}: ${plan} - ${billing_interval}`);

    return res.json({
      success: true,
      message: 'Abonnement mis à jour avec succès',
      data: { subscription: activeSubscription },
    });
  } catch (error) {
    logger.error('Update organization subscription error:', error);
    next(error);
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  suspendOrganization,
  activateOrganization,
  getOrganizationSales,
  getOrganizationUsers,
  changeUserPassword,
  getAllInvoices,
  getOrganizationInvoices,
  updateOrganizationSubscription,
};
