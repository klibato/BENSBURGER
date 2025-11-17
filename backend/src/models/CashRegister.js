const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashRegister = sequelize.define('cash_registers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  register_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  opened_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  closed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  opening_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  closing_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  expected_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  counted_cash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  difference: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  total_cash_collected: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total_sales: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total_cash: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total_card: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total_meal_voucher: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  ticket_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'closed']],
    },
  },
  closing_report: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  closing_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  opened_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    comment: 'Organisation à laquelle appartient la caisse',
  },
}, {
  tableName: 'cash_registers',
  timestamps: false,
});

module.exports = CashRegister;
