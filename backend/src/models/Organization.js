const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Organization = sequelize.define('organizations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255],
    },
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^[a-z0-9-]+$/, // lowercase, numbers, hyphens only
      len: [3, 100],
    },
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: {
      isUrl: {
        msg: 'Le domaine doit être une URL valide',
      },
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Paramètres métier (adresse, infos légales, configs imprimante, etc.)',
  },
  plan: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'free',
    validate: {
      isIn: [['free', 'starter', 'premium', 'enterprise']],
    },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'suspended', 'cancelled']],
    },
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subscription_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3, // Plan free
    validate: {
      min: 1,
    },
  },
  max_products: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50, // Plan free
    validate: {
      min: 1,
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

// ============================================
// MÉTHODES D'INSTANCE
// ============================================

/**
 * Vérifie si l'organisation est active
 * @returns {boolean}
 */
Organization.prototype.isActive = function () {
  return this.status === 'active' && !this.deleted_at;
};

/**
 * Vérifie si l'organisation est en période d'essai
 * @returns {boolean}
 */
Organization.prototype.isInTrial = function () {
  if (!this.trial_ends_at) return false;
  return new Date() < new Date(this.trial_ends_at);
};

/**
 * Vérifie si l'abonnement est expiré
 * @returns {boolean}
 */
Organization.prototype.isSubscriptionExpired = function () {
  if (!this.subscription_ends_at) return false;
  return new Date() > new Date(this.subscription_ends_at);
};

/**
 * Vérifie si on peut ajouter un nouvel utilisateur
 * @returns {Promise<boolean>}
 */
Organization.prototype.canAddUser = async function () {
  const User = require('./User');
  const userCount = await User.count({
    where: {
      organization_id: this.id,
      is_active: true,
    },
  });
  return userCount < this.max_users;
};

/**
 * Vérifie si on peut ajouter un nouveau produit
 * @returns {Promise<boolean>}
 */
Organization.prototype.canAddProduct = async function () {
  const Product = require('./Product');
  const productCount = await Product.count({
    where: {
      organization_id: this.id,
    },
    paranoid: true, // Exclut les soft-deleted
  });
  return productCount < this.max_products;
};

/**
 * Obtient le nombre d'utilisateurs actifs
 * @returns {Promise<number>}
 */
Organization.prototype.getUserCount = async function () {
  const User = require('./User');
  return await User.count({
    where: {
      organization_id: this.id,
      is_active: true,
    },
  });
};

/**
 * Obtient le nombre de produits actifs
 * @returns {Promise<number>}
 */
Organization.prototype.getProductCount = async function () {
  const Product = require('./Product');
  return await Product.count({
    where: {
      organization_id: this.id,
    },
    paranoid: true,
  });
};

/**
 * Retourne les infos publiques (sans données sensibles)
 * @returns {Object}
 */
Organization.prototype.toPublicJSON = function () {
  const {
    id,
    name,
    slug,
    email,
    phone,
    plan,
    status,
    created_at,
  } = this;

  return {
    id,
    name,
    slug,
    email,
    phone,
    plan,
    status,
    created_at,
  };
};

/**
 * Définit les limites selon le plan
 * @param {string} plan - 'free', 'starter', 'premium', 'enterprise'
 */
Organization.prototype.applyPlanLimits = function (plan) {
  const limits = {
    free: { max_users: 3, max_products: 50 },
    starter: { max_users: 10, max_products: 200 },
    premium: { max_users: 50, max_products: 1000 },
    enterprise: { max_users: 999, max_products: 9999 },
  };

  const planLimits = limits[plan] || limits.free;
  this.max_users = planLimits.max_users;
  this.max_products = planLimits.max_products;
  this.plan = plan;
};

module.exports = Organization;
