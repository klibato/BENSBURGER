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
      min: 0,
      max: 100,
    },
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL externe de l\'image (optionnel)',
  },
  image_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Chemin local de l\'image uploadée (ex: uploads/products/abc123.jpg)',
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Quantité en stock',
  },
  low_stock_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: 0,
    },
    comment: 'Seuil d\'alerte stock bas',
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    comment: 'Organisation propriétaire du produit',
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

// Vérifier si le produit a un stock suffisant
Product.prototype.hasStock = function (requestedQuantity = 1) {
  // Les menus n'ont pas de gestion de stock direct
  if (this.is_menu) {
    return true;
  }
  return this.quantity >= requestedQuantity;
};

// Vérifier si le stock est bas
Product.prototype.isLowStock = function () {
  // Les menus n'ont pas de gestion de stock
  if (this.is_menu) {
    return false;
  }
  return this.quantity <= this.low_stock_threshold && this.quantity > 0;
};

// Vérifier si le produit est en rupture de stock
Product.prototype.isOutOfStock = function () {
  // Les menus n'ont pas de gestion de stock
  if (this.is_menu) {
    return false;
  }
  return this.quantity === 0;
};

// Décrémenter le stock
Product.prototype.decrementStock = async function (quantity = 1) {
  // Les menus n'ont pas de gestion de stock direct
  if (this.is_menu) {
    return true;
  }

  if (!this.hasStock(quantity)) {
    throw new Error(`Stock insuffisant pour ${this.name}. Disponible: ${this.quantity}, Demandé: ${quantity}`);
  }

  this.quantity -= quantity;
  await this.save();
  return true;
};

// Incrémenter le stock (réapprovisionnement)
Product.prototype.incrementStock = async function (quantity = 1) {
  if (this.is_menu) {
    return true;
  }

  this.quantity += quantity;
  await this.save();
  return true;
};

// Méthode pour obtenir le JSON avec price_ttc et infos stock
Product.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.price_ttc = this.getPriceTTC();
  values.is_low_stock = this.isLowStock();
  values.is_out_of_stock = this.isOutOfStock();
  return values;
};

module.exports = Product;
