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
      isValidPin(value) {
        // ✅ P1-1: PIN 6 chiffres minimum (sécurité anti-brute-force)
        // La validation s'applique AVANT le hashing bcrypt
        // Si le PIN est déjà hashé (starts with $2), on skip la validation
        if (value && !value.startsWith('$2')) {
          if (!/^\d{6,}$/.test(value)) {
            throw new Error('Le PIN doit contenir au moins 6 chiffres');
          }
        }
      },
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
  is_super_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Super admin ayant accès à toutes les organisations',
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
  deletion_requested_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'Date de demande de suppression du compte (RGPD Article 17). Les comptes sont supprimés 30 jours après cette date.',
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
  const { id, username, role, first_name, last_name, email, is_active, is_super_admin } = this;
  return {
    id,
    username,
    role,
    first_name,
    last_name,
    email,
    is_active,
    is_super_admin,
  };
};

module.exports = User;
