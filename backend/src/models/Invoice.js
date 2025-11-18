const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('invoices', {
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
  subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'subscriptions',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Numéro de facture séquentiel (ex: INV-2025-00001)',
  },
  subtotal_cents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Montant HT en centimes',
  },
  tax_cents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Montant TVA en centimes',
  },
  total_cents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Montant TTC en centimes (subtotal + tax)',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 20.00,
    comment: 'Taux de TVA (20% en France)',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'open', 'paid', 'void', 'uncollectible']],
    },
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  period_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  period_end: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  stripe_invoice_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  stripe_charge_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'card, sepa, bank_transfer',
  },
  pdf_url: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// ============================================
// MÉTHODES D'INSTANCE
// ============================================

/**
 * Vérifie si la facture est payée
 * @returns {boolean}
 */
Invoice.prototype.isPaid = function () {
  return this.status === 'paid' && this.paid_at !== null;
};

/**
 * Vérifie si la facture est en retard
 * @returns {boolean}
 */
Invoice.prototype.isOverdue = function () {
  if (this.isPaid() || this.status === 'void') return false;
  return new Date() > new Date(this.due_date);
};

/**
 * Calcule le nombre de jours de retard
 * @returns {number}
 */
Invoice.prototype.getDaysOverdue = function () {
  if (!this.isOverdue()) return 0;
  const now = new Date();
  const due = new Date(this.due_date);
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Obtient le montant total formaté en euros
 * @returns {string} Ex: "49.00 €"
 */
Invoice.prototype.getTotalFormatted = function () {
  const euros = (this.total_cents / 100).toFixed(2);
  return `${euros} €`;
};

/**
 * Obtient le montant HT formaté
 * @returns {string}
 */
Invoice.prototype.getSubtotalFormatted = function () {
  const euros = (this.subtotal_cents / 100).toFixed(2);
  return `${euros} €`;
};

/**
 * Obtient le montant TVA formaté
 * @returns {string}
 */
Invoice.prototype.getTaxFormatted = function () {
  const euros = (this.tax_cents / 100).toFixed(2);
  return `${euros} €`;
};

/**
 * Marque la facture comme payée
 * @param {string} paymentMethod - 'card', 'sepa', 'bank_transfer'
 * @returns {Promise<Invoice>}
 */
Invoice.prototype.markAsPaid = async function (paymentMethod = null) {
  this.status = 'paid';
  this.paid_at = new Date();
  if (paymentMethod) {
    this.payment_method = paymentMethod;
  }
  return await this.save();
};

/**
 * Annule la facture
 * @returns {Promise<Invoice>}
 */
Invoice.prototype.markAsVoid = async function () {
  this.status = 'void';
  return await this.save();
};

/**
 * Renvoie les infos pour JSON
 * @returns {Object}
 */
Invoice.prototype.toPublicJSON = function () {
  return {
    id: this.id,
    invoice_number: this.invoice_number,
    status: this.status,
    subtotal: this.getSubtotalFormatted(),
    tax: this.getTaxFormatted(),
    total: this.getTotalFormatted(),
    tax_rate: parseFloat(this.tax_rate),
    due_date: this.due_date,
    paid_at: this.paid_at,
    is_paid: this.isPaid(),
    is_overdue: this.isOverdue(),
    days_overdue: this.getDaysOverdue(),
    period_start: this.period_start,
    period_end: this.period_end,
    pdf_url: this.pdf_url,
    created_at: this.created_at,
  };
};

// ============================================
// MÉTHODES STATIQUES
// ============================================

/**
 * Calcule les montants TTC à partir du HT et taux de TVA
 * @param {number} subtotalCents - Montant HT en centimes
 * @param {number} taxRate - Taux de TVA (ex: 20.00)
 * @returns {Object} { subtotal_cents, tax_cents, total_cents }
 */
Invoice.calculateAmounts = function (subtotalCents, taxRate = 20.00) {
  const taxCents = Math.round(subtotalCents * (taxRate / 100));
  const totalCents = subtotalCents + taxCents;

  return {
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    total_cents: totalCents,
  };
};

/**
 * Génère une facture pour un abonnement
 * @param {Object} subscription - Instance Subscription
 * @param {Object} organization - Instance Organization
 * @returns {Promise<Invoice>}
 */
Invoice.createFromSubscription = async function (subscription, organization) {
  const amounts = Invoice.calculateAmounts(subscription.price_cents, 20.00);

  // Date d'échéance : +30 jours
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await Invoice.create({
    organization_id: organization.id,
    subscription_id: subscription.id,
    invoice_number: '', // Auto-généré par trigger SQL
    ...amounts,
    currency: subscription.currency,
    tax_rate: 20.00,
    status: 'open',
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end,
    due_date: dueDate,
    metadata: {
      plan: subscription.plan,
      billing_interval: subscription.billing_interval,
    },
  });

  return invoice;
};

module.exports = Invoice;
