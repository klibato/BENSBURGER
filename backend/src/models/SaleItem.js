const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SaleItem = sequelize.define('sale_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sale_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id',
    },
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  },
  unit_price_ht: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  vat_rate: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
  },
  total_ht: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total_ttc: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    comment: 'Organisation à laquelle appartient la ligne de vente',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'sale_items',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
  hooks: {
    beforeUpdate: () => {
      // NF525 Compliance: Les lignes de vente sont immuables après création
      throw new Error(
        'NF525 Compliance: Sale items are immutable. UPDATE operations are not allowed.'
      );
    },
  },
});

module.exports = SaleItem;
