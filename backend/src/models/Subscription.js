const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('subscriptions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  plan: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['free', 'starter', 'premium', 'enterprise']],
    },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['active', 'cancelled', 'past_due', 'trialing', 'expired']],
    },
  },
  price_cents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Prix en centimes (ex: 2900 = 29.00€)',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
  },
  billing_interval: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'monthly',
    validate: {
      isIn: [['monthly', 'yearly']],
    },
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  stripe_subscription_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  stripe_customer_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'card, sepa, bank_transfer',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// ============================================
// MÉTHODES D'INSTANCE
// ============================================

/**
 * Vérifie si l'abonnement est actif
 * @returns {boolean}
 */
Subscription.prototype.isActive = function () {
  return this.status === 'active' && !this.ended_at;
};

/**
 * Vérifie si l'abonnement est en période d'essai
 * @returns {boolean}
 */
Subscription.prototype.isTrialing = function () {
  if (!this.trial_ends_at) return false;
  return new Date() < new Date(this.trial_ends_at) && this.status === 'trialing';
};

/**
 * Vérifie si l'abonnement est expiré
 * @returns {boolean}
 */
Subscription.prototype.isExpired = function () {
  return this.status === 'expired' || new Date() > new Date(this.current_period_end);
};

/**
 * Obtient le prix formaté en euros
 * @returns {string} Ex: "29.00 €"
 */
Subscription.prototype.getPriceFormatted = function () {
  const euros = (this.price_cents / 100).toFixed(2);
  return `${euros} €`;
};

/**
 * Calcule les jours restants dans la période actuelle
 * @returns {number}
 */
Subscription.prototype.getDaysRemaining = function () {
  const now = new Date();
  const end = new Date(this.current_period_end);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Renvoie les infos pour JSON (sans données sensibles)
 * @returns {Object}
 */
Subscription.prototype.toPublicJSON = function () {
  return {
    id: this.id,
    plan: this.plan,
    status: this.status,
    price: this.getPriceFormatted(),
    billing_interval: this.billing_interval,
    current_period_end: this.current_period_end,
    days_remaining: this.getDaysRemaining(),
    is_active: this.isActive(),
    is_trialing: this.isTrialing(),
  };
};

// ============================================
// MÉTHODES STATIQUES
// ============================================

/**
 * Obtient le prix en centimes selon le plan
 * @param {string} plan - 'free', 'starter', 'premium', 'enterprise'
 * @returns {number}
 */
Subscription.getPlanPrice = function (plan) {
  const prices = {
    free: 0,
    starter: 2900,  // 29€
    premium: 4900,  // 49€
    enterprise: 9900, // 99€
  };
  return prices[plan] || 0;
};

/**
 * Obtient les limites d'un plan
 * @param {string} plan
 * @returns {Object}
 */
Subscription.getPlanLimits = function (plan) {
  const limits = {
    free: { max_users: 3, max_products: 50 },
    starter: { max_users: 10, max_products: 200 },
    premium: { max_users: 50, max_products: 1000 },
    enterprise: { max_users: 999, max_products: 9999 },
  };
  return limits[plan] || limits.free;
};

module.exports = Subscription;
