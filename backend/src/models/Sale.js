const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('sales', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ticket_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    defaultValue: '', // Sera généré par le hook
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  total_ht: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total_ttc: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  vat_details: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  payment_method: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['cash', 'card', 'meal_voucher', 'mixed']],
    },
  },
  payment_details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  change_given: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'completed',
    validate: {
      isIn: [['completed', 'cancelled', 'refunded']],
    },
  },
  cash_register_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'cash_registers',
      key: 'id',
    },
  },
  discount_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['percentage', 'amount']],
    },
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelled_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    comment: 'Organisation à laquelle appartient la vente',
  },
}, {
  tableName: 'sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeValidate: async (sale) => {
      // Générer le ticket_number si non fourni
      if (!sale.ticket_number || sale.ticket_number === '') {
        const [result] = await sequelize.query(
          `SELECT TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0') AS ticket_number`
        );
        sale.ticket_number = result[0].ticket_number;
      }
    },
  },
});

module.exports = Sale;
