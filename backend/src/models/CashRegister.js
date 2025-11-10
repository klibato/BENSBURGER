const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashRegister = sequelize.define('cash_registers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  opening_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  closing_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  expected_cash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  actual_cash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  cash_difference: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
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
}, {
  tableName: 'cash_registers',
  timestamps: false,
});

module.exports = CashRegister;
