const { Organization, User, sequelize } = require('../models');
const logger = require('../utils/logger');
const { generateSlug } = require('../utils/helpers');

/**
 * Créer une nouvelle organisation (inscription)
 * @route POST /api/organizations/register
 * @access Public
 */
const registerOrganization = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      plan = 'free',
      // Informations administrateur
      admin_username,
      admin_pin_code,
      admin_first_name,
      admin_last_name,
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_NAME',
          message: 'Le nom de l\'organisation est requis',
        },
      });
    }

    if (!admin_username || !admin_pin_code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ADMIN_CREDENTIALS',
          message: 'Les identifiants de l\'administrateur sont requis',
        },
      });
    }

    // Générer un slug unique
    let slug = generateSlug(name);
    const existingSlug = await Organization.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Appliquer les limites selon le plan
    const planLimits = {
      free: { max_users: 3, max_products: 50 },
      starter: { max_users: 10, max_products: 200 },
      premium: { max_users: 50, max_products: 1000 },
      enterprise: { max_users: 999, max_products: 9999 },
    };

    const limits = planLimits[plan] || planLimits.free;

    // ============================================
    // TRANSACTION ATOMIQUE (org + admin)
    // ============================================
    const transaction = await sequelize.transaction();

    let organization;
    let adminUser;

    try {
      // Créer l'organisation
      organization = await Organization.create(
        {
          name,
          slug,
          email,
          phone,
          plan,
          status: 'active',
          max_users: limits.max_users,
          max_products: limits.max_products,
          settings: {
            store_name: name,
            currency: 'EUR',
            currency_symbol: '€',
            theme_color: '#FF6B35',
            language: 'fr-FR',
            timezone: 'Europe/Paris',
            categories: [],
            vat_rates: [],
            payment_methods: {
              cash: { enabled: true },
              card: { enabled: true },
              meal_voucher: { enabled: false },
            },
          },
        },
        { transaction }
      );

      // Créer l'utilisateur administrateur
      // Note: Le PIN sera automatiquement haché par le hook beforeCreate du modèle User
      adminUser = await User.create(
        {
          organization_id: organization.id,
          username: admin_username,
          pin_code: admin_pin_code, // Envoyer le PIN en clair, le hook le hashera
          first_name: admin_first_name || 'Admin',
          last_name: admin_last_name || '',
          role: 'admin',
          is_active: true,
        },
        { transaction }
      );

      // Commit si tout OK
      await transaction.commit();
    } catch (error) {
      // Rollback en cas d'erreur
      await transaction.rollback();

      // Gestion erreurs spécifiques
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path;

        if (field === 'username') {
          return res.status(409).json({
            success: false,
            error: {
              code: 'USERNAME_ALREADY_EXISTS',
              message: `Le nom d'utilisateur "${admin_username}" est déjà utilisé`,
              field: 'admin_username',
            },
          });
        }

        if (field === 'slug') {
          return res.status(409).json({
            success: false,
            error: {
              code: 'ORGANIZATION_ALREADY_EXISTS',
              message: `Une organisation avec ce nom existe déjà`,
              field: 'name',
            },
          });
        }
      }

      // Erreur générique
      logger.error('Erreur lors de la création de l\'organisation:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ORGANIZATION_CREATION_FAILED',
          message: 'Erreur lors de la création de l\'organisation',
          details: error.message,
        },
      });
    }

    logger.info(`Nouvelle organisation créée: ${name} (${slug}) avec admin: ${admin_username}`);

    res.status(201).json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          status: organization.status,
        },
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
        },
      },
      message: 'Organisation créée avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'organisation:', error);
    next(error);
  }
};

/**
 * Récupérer toutes les organisations
 * @route GET /api/organizations
 * @access Super Admin only (future feature)
 */
const getAllOrganizations = async (req, res, next) => {
  try {
    const { status, plan, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const { count, rows: organizations } = await Organization.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'name',
        'slug',
        'email',
        'phone',
        'plan',
        'status',
        'max_users',
        'max_products',
        'created_at',
      ],
    });

    res.json({
      success: true,
      data: {
        organizations,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: count > parseInt(offset) + parseInt(limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des organisations:', error);
    next(error);
  }
};

/**
 * Récupérer une organisation par ID
 * @route GET /api/organizations/:id
 * @access Admin de l'organisation
 */
const getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur accède à sa propre organisation
    if (parseInt(id) !== req.organizationId && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès refusé',
        },
      });
    }

    const organization = await Organization.findByPk(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organisation introuvable',
        },
      });
    }

    // Compter les utilisateurs et produits
    const userCount = await User.count({
      where: { organization_id: id, is_active: true },
    });

    const { Product } = require('../models');
    const productCount = await Product.count({
      where: { organization_id: id },
    });

    res.json({
      success: true,
      data: {
        ...organization.toJSON(),
        stats: {
          user_count: userCount,
          product_count: productCount,
          user_limit_reached: userCount >= organization.max_users,
          product_limit_reached: productCount >= organization.max_products,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'organisation:', error);
    next(error);
  }
};

/**
 * Mettre à jour une organisation
 * @route PUT /api/organizations/:id
 * @access Admin de l'organisation
 */
const updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur accède à sa propre organisation
    if (parseInt(id) !== req.organizationId && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès refusé',
        },
      });
    }

    const organization = await Organization.findByPk(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organisation introuvable',
        },
      });
    }

    const { name, email, phone, status } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (status && req.user.role === 'super_admin') updateData.status = status;

    await organization.update(updateData);

    logger.info(`Organisation ${id} mise à jour par ${req.user.username}`);

    res.json({
      success: true,
      data: organization,
      message: 'Organisation mise à jour avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'organisation:', error);
    next(error);
  }
};

/**
 * Supprimer une organisation (soft delete)
 * @route DELETE /api/organizations/:id
 * @access Super Admin only
 */
const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findByPk(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organisation introuvable',
        },
      });
    }

    // Soft delete
    await organization.update({
      status: 'deleted',
      deleted_at: new Date(),
    });

    logger.info(`Organisation ${id} supprimée par ${req.user.username}`);

    res.json({
      success: true,
      message: 'Organisation supprimée avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'organisation:', error);
    next(error);
  }
};

module.exports = {
  registerOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
};
