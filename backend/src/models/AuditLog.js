const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Type d\'action: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, OPEN_REGISTER, CLOSE_REGISTER, SALE, etc.',
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type d\'entité: sale, product, user, cash_register, etc.',
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
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
    comment: 'Organisation à laquelle appartient le log d\'audit',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
});

/**
 * Méthode helper pour créer un log facilement
 * @param {Object} data - Données du log
 * @param {number} data.organizationId - ID de l'organisation (REQUIS)
 * @param {number} data.userId - ID de l'utilisateur
 * @param {string} data.action - Action effectuée
 * @param {string} data.entityType - Type d'entité
 * @param {number} data.entityId - ID de l'entité
 * @param {Object} data.details - Détails (old_values, new_values, etc.)
 * @param {string} data.ipAddress - Adresse IP
 * @param {string} data.userAgent - User agent
 */
AuditLog.log = async function (data) {
  try {
    if (!data.organizationId) {
      console.error('AuditLog.log: organization_id est requis');
      return null;
    }

    return await AuditLog.create({
      organization_id: data.organizationId,
      user_id: data.userId || null,
      action: data.action,
      entity_type: data.entityType || null,
      entity_id: data.entityId || null,
      old_values: data.details?.oldValues || null,
      new_values: data.details?.newValues || data.details || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
    });
  } catch (error) {
    console.error('Erreur lors de la création du log d\'audit:', error);
    // Ne pas bloquer l'application si le logging échoue
    return null;
  }
};

module.exports = AuditLog;
