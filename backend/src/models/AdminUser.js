const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const AdminUser = sequelize.define('admin_users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 100],
    },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Hash bcrypt (10 rounds minimum)',
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'admin',
    validate: {
      isIn: [['super_admin', 'admin', 'support']],
    },
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array de permissions: ["organizations:read", "subscriptions:manage", etc.]',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_login_ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  email_verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  reset_token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  two_factor_secret: {
    type: DataTypes.STRING(255),
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
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'admin_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

// ============================================
// HOOKS
// ============================================

/**
 * Hash le mot de passe avant création
 */
AdminUser.beforeCreate(async (adminUser) => {
  if (adminUser.password_hash && !adminUser.password_hash.startsWith('$2')) {
    adminUser.password_hash = await bcrypt.hash(adminUser.password_hash, 10);
  }
});

/**
 * Hash le mot de passe avant mise à jour (si changé)
 */
AdminUser.beforeUpdate(async (adminUser) => {
  if (adminUser.changed('password_hash') && !adminUser.password_hash.startsWith('$2')) {
    adminUser.password_hash = await bcrypt.hash(adminUser.password_hash, 10);
  }
});

// ============================================
// MÉTHODES D'INSTANCE
// ============================================

/**
 * Vérifie le mot de passe
 * @param {string} password
 * @returns {Promise<boolean>}
 */
AdminUser.prototype.verifyPassword = async function (password) {
  return await bcrypt.compare(password, this.password_hash);
};

/**
 * Vérifie si l'admin est actif et vérifié
 * @returns {boolean}
 */
AdminUser.prototype.isActiveAndVerified = function () {
  return this.is_active && this.email_verified && !this.deleted_at;
};

/**
 * Vérifie si l'admin a une permission spécifique
 * @param {string} permission - Ex: 'organizations:write'
 * @returns {boolean}
 */
AdminUser.prototype.hasPermission = function (permission) {
  // Super-admin a toutes les permissions
  if (this.role === 'super_admin' || this.permissions.includes('*')) {
    return true;
  }

  // Vérifier permission exacte
  if (this.permissions.includes(permission)) {
    return true;
  }

  // Vérifier wildcard (ex: "organizations:*" permet "organizations:read")
  const [resource, action] = permission.split(':');
  const wildcardPermission = `${resource}:*`;

  return this.permissions.includes(wildcardPermission);
};

/**
 * Obtient le nom complet
 * @returns {string}
 */
AdminUser.prototype.getFullName = function () {
  if (this.first_name && this.last_name) {
    return `${this.first_name} ${this.last_name}`;
  }
  return this.username;
};

/**
 * Marque l'email comme vérifié
 * @returns {Promise<AdminUser>}
 */
AdminUser.prototype.markEmailAsVerified = async function () {
  this.email_verified = true;
  this.email_verified_at = new Date();
  return await this.save();
};

/**
 * Enregistre une connexion
 * @param {string} ipAddress
 * @returns {Promise<AdminUser>}
 */
AdminUser.prototype.recordLogin = async function (ipAddress = null) {
  this.last_login_at = new Date();
  if (ipAddress) {
    this.last_login_ip = ipAddress;
  }
  return await this.save();
};

/**
 * Génère un token de réinitialisation de mot de passe
 * @returns {Promise<string>}
 */
AdminUser.prototype.generateResetToken = async function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  this.reset_token = token;
  this.reset_token_expires_at = new Date(Date.now() + 3600000); // 1h

  await this.save();

  return token;
};

/**
 * Vérifie si le token de réinitialisation est valide
 * @param {string} token
 * @returns {boolean}
 */
AdminUser.prototype.isResetTokenValid = function (token) {
  if (!this.reset_token || !this.reset_token_expires_at) {
    return false;
  }

  if (this.reset_token !== token) {
    return false;
  }

  return new Date() < new Date(this.reset_token_expires_at);
};

/**
 * Réinitialise le mot de passe avec un token
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<AdminUser>}
 */
AdminUser.prototype.resetPasswordWithToken = async function (token, newPassword) {
  if (!this.isResetTokenValid(token)) {
    throw new Error('Invalid or expired reset token');
  }

  this.password_hash = newPassword; // Sera hashé par le hook beforeUpdate
  this.reset_token = null;
  this.reset_token_expires_at = null;

  return await this.save();
};

/**
 * Renvoie les infos publiques (sans données sensibles)
 * @returns {Object}
 */
AdminUser.prototype.toPublicJSON = function () {
  return {
    id: this.id,
    email: this.email,
    username: this.username,
    full_name: this.getFullName(),
    role: this.role,
    permissions: this.permissions,
    is_active: this.is_active,
    email_verified: this.email_verified,
    two_factor_enabled: this.two_factor_enabled,
    last_login_at: this.last_login_at,
    created_at: this.created_at,
  };
};

// ============================================
// MÉTHODES STATIQUES
// ============================================

/**
 * Trouve un admin par email ou username
 * @param {string} identifier - Email ou username
 * @returns {Promise<AdminUser|null>}
 */
AdminUser.findByIdentifier = async function (identifier) {
  return await AdminUser.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { email: identifier },
        { username: identifier },
      ],
    },
  });
};

/**
 * Crée un nouvel admin avec hash automatique du mot de passe
 * @param {Object} data
 * @returns {Promise<AdminUser>}
 */
AdminUser.createAdmin = async function (data) {
  return await AdminUser.create({
    email: data.email,
    username: data.username,
    password_hash: data.password, // Sera hashé par le hook
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    role: data.role || 'admin',
    permissions: data.permissions || [],
    is_active: data.is_active !== undefined ? data.is_active : true,
    email_verified: data.email_verified || false,
  });
};

module.exports = AdminUser;
