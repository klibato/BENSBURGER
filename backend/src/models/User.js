const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 100],
    },
  },
  pin_code: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['admin', 'cashier']],
    },
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    comment: 'Organisation à laquelle appartient l\'utilisateur',
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
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.pin_code) {
        user.pin_code = await bcrypt.hash(user.pin_code, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('pin_code')) {
        user.pin_code = await bcrypt.hash(user.pin_code, 10);
      }
    },
  },
});

// Méthode d'instance pour vérifier le PIN
User.prototype.validatePinCode = async function (pin) {
  return bcrypt.compare(pin, this.pin_code);
};

// Méthode d'instance pour obtenir les infos publiques (sans PIN)
User.prototype.toPublicJSON = function () {
  const { id, username, role, first_name, last_name, email, is_active } = this;
  return {
    id,
    username,
    role,
    first_name,
    last_name,
    email,
    is_active,
  };
};

module.exports = User;
