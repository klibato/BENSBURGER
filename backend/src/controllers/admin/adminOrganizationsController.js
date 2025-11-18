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

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  suspendOrganization,
  activateOrganization,
};
