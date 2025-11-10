const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('products', {
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
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price_ht: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  vat_rate: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    validate: {
      isIn: [[5.5, 10.0, 20.0]],
    },
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['burgers', 'sides', 'drinks', 'desserts', 'menus']],
    },
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_menu: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
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
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

// Getter virtuel pour price_ttc
Product.prototype.getPriceTTC = function () {
  return (parseFloat(this.price_ht) * (1 + parseFloat(this.vat_rate) / 100)).toFixed(2);
};

// Méthode pour obtenir le JSON avec price_ttc
Product.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.price_ttc = this.getPriceTTC();
  return values;
};

module.exports = Product;
