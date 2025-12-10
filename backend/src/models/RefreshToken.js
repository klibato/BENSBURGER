/**
 * ✅ P1-6: Modèle RefreshToken pour JWT rotation
 *
 * Stocke les refresh tokens pour permettre le renouvellement des access tokens
 * sans re-authentification. Améliore la sécurité en permettant des access tokens
 * à courte durée de vie (15 min) + refresh tokens à longue durée (7 jours).
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const RefreshToken = sequelize.define('refresh_tokens', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Refresh token cryptographiquement sécurisé (SHA-256)',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: 'Utilisateur propriétaire du token',
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    comment: 'Organisation (pour multi-tenant)',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date d\'expiration du refresh token (7 jours recommandé)',
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date de révocation (logout, compromission, etc.)',
  },
  replaced_by_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Token qui a remplacé celui-ci (rotation)',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: false,
  indexes: [
    {
      fields: ['token'],
      unique: true,
    },
    {
      fields: ['user_id'],
    },
    {
      fields: ['expires_at'],
    },
  ],
});

/**
 * Génère un nouveau refresh token cryptographiquement sécurisé
 * @param {number} userId - ID de l'utilisateur
 * @param {number} organizationId - ID de l'organisation
 * @param {number} expiresInDays - Nombre de jours avant expiration (défaut: 7)
 * @returns {Promise<Object>} Instance RefreshToken créée
 */
RefreshToken.generateToken = async function (userId, organizationId, expiresInDays = 7) {
  // Générer un token aléatoire sécurisé (64 bytes = 512 bits)
  const tokenValue = crypto.randomBytes(64).toString('hex');

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Créer le refresh token en BDD
  const refreshToken = await this.create({
    token: tokenValue,
    user_id: userId,
    organization_id: organizationId,
    expires_at: expiresAt,
  });

  return refreshToken;
};

/**
 * Vérifie si un refresh token est valide (existe, non expiré, non révoqué)
 * @param {string} tokenValue - Valeur du token
 * @returns {Promise<Object|null>} Instance RefreshToken ou null si invalide
 */
RefreshToken.isValid = async function (tokenValue) {
  const token = await this.findOne({
    where: {
      token: tokenValue,
    },
  });

  if (!token) {
    return null; // Token n'existe pas
  }

  if (token.revoked_at) {
    return null; // Token révoqué
  }

  if (new Date() > new Date(token.expires_at)) {
    return null; // Token expiré
  }

  return token;
};

/**
 * Révoque un refresh token (logout, compromission)
 * @param {string} tokenValue - Valeur du token à révoquer
 * @returns {Promise<boolean>} true si révoqué avec succès
 */
RefreshToken.revoke = async function (tokenValue) {
  const result = await this.update(
    {
      revoked_at: new Date(),
    },
    {
      where: {
        token: tokenValue,
        revoked_at: null, // Seulement si pas déjà révoqué
      },
    },
  );

  return result[0] > 0; // Retourne true si au moins 1 ligne mise à jour
};

/**
 * Révoque tous les refresh tokens d'un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<number>} Nombre de tokens révoqués
 */
RefreshToken.revokeAllForUser = async function (userId) {
  const result = await this.update(
    {
      revoked_at: new Date(),
    },
    {
      where: {
        user_id: userId,
        revoked_at: null,
      },
    },
  );

  return result[0];
};

/**
 * Nettoie les tokens expirés (à appeler dans un CRON job)
 * @returns {Promise<number>} Nombre de tokens supprimés
 */
RefreshToken.cleanExpired = async function () {
  const result = await this.destroy({
    where: {
      expires_at: {
        [require('sequelize').Op.lt]: new Date(),
      },
    },
  });

  return result;
};

module.exports = RefreshToken;
