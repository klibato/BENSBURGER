const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Model HashChain - Chaînage cryptographique NF525
 * Conforme décret n°2016-1551 (anti-fraude TVA)
 *
 * Chaque vente génère une entrée dans hash_chain avec:
 * - Un hash SHA-256 des données de la vente
 * - Le hash de la vente précédente (chaînage)
 * - Un numéro de séquence incrémental
 *
 * ⚠️ IMMUABLE: Aucune modification/suppression autorisée après création
 */
class HashChain extends Model {}

HashChain.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Identifiant unique UUID',
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id',
      },
      comment: 'Organisation propriétaire (multi-tenant)',
    },
    sale_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'sales',
        key: 'id',
      },
      comment: 'Vente associée (relation 1:1)',
    },
    sequence_number: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Numéro séquentiel incrémental par organisation (auto-calculé par trigger)',
    },
    current_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        len: [64, 64],
        isHexadecimal: true,
      },
      comment: 'Hash SHA-256 de la vente actuelle (64 caractères hex)',
    },
    previous_hash: {
      type: DataTypes.STRING(64),
      allowNull: true, // NULL pour la première vente
      validate: {
        len: [64, 64],
        isHexadecimal: true,
      },
      comment: 'Hash SHA-256 de la vente précédente (NULL si première vente)',
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Signature numérique RSA optionnelle (certification avancée)',
    },
    certified_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Horodatage certifié immuable',
    },
  },
  {
    sequelize,
    modelName: 'HashChain',
    tableName: 'hash_chain',
    timestamps: true, // created_at seulement
    updatedAt: false, // Pas de updatedAt (immuable)
    paranoid: false, // Pas de soft delete (immuable)
    indexes: [
      {
        name: 'idx_hash_chain_org',
        fields: ['organization_id'],
      },
      {
        name: 'idx_hash_chain_sale',
        fields: ['sale_id'],
      },
      {
        name: 'idx_hash_chain_seq',
        fields: ['organization_id', 'sequence_number'],
        unique: true,
      },
      {
        name: 'idx_hash_chain_timestamp',
        fields: ['certified_timestamp'],
      },
    ],
    comment: 'Chaînage cryptographique NF525 - Hash SHA-256 immuable',
  }
);

/**
 * Méthodes de classe utilitaires
 */

/**
 * Récupère le dernier hash d'une organisation
 * @param {Number} organizationId
 * @param {Transaction} transaction - Transaction Sequelize optionnelle
 * @returns {Promise<HashChain|null>}
 */
HashChain.getLastHash = async function (organizationId, transaction = null) {
  return await this.findOne({
    where: { organization_id: organizationId },
    order: [['sequence_number', 'DESC']],
    lock: transaction ? transaction.LOCK.UPDATE : undefined, // Lock pessimiste si transaction
    transaction,
  });
};

/**
 * Récupère le prochain numéro de séquence
 * @param {Number} organizationId
 * @param {Transaction} transaction
 * @returns {Promise<Number>}
 */
HashChain.getNextSequenceNumber = async function (organizationId, transaction = null) {
  const lastHash = await this.getLastHash(organizationId, transaction);
  return lastHash ? lastHash.sequence_number + 1 : 1;
};

/**
 * Vérifie si le hash est valide (format)
 * @param {String} hash
 * @returns {Boolean}
 */
HashChain.isValidHash = function (hash) {
  if (!hash || typeof hash !== 'string') return false;
  if (hash.length !== 64) return false;
  return /^[a-f0-9]{64}$/.test(hash);
};

/**
 * Statistiques NF525 pour une organisation
 * @param {Number} organizationId
 * @returns {Promise<Object>}
 */
HashChain.getStats = async function (organizationId) {
  const [stats] = await sequelize.query(`
    SELECT
      COUNT(*) as total_entries,
      MIN(sequence_number) as first_sequence,
      MAX(sequence_number) as last_sequence,
      MIN(certified_timestamp) as first_sale_date,
      MAX(certified_timestamp) as last_sale_date
    FROM hash_chain
    WHERE organization_id = ?
  `, {
    replacements: [organizationId],
    type: sequelize.QueryTypes.SELECT,
  });

  return stats || {
    total_entries: 0,
    first_sequence: null,
    last_sequence: null,
    first_sale_date: null,
    last_sale_date: null,
  };
};

/**
 * Méthodes d'instance
 */

/**
 * Vérifie si ce hash est correctement chaîné avec le précédent
 * @returns {Promise<Boolean>}
 */
HashChain.prototype.verifyChaining = async function () {
  // Première vente: previous_hash doit être NULL
  if (this.sequence_number === 1) {
    return this.previous_hash === null;
  }

  // Ventes suivantes: vérifier chaînage
  const previousHash = await HashChain.findOne({
    where: {
      organization_id: this.organization_id,
      sequence_number: this.sequence_number - 1,
    },
    attributes: ['current_hash'],
  });

  if (!previousHash) {
    return false; // Manque le hash précédent
  }

  return this.previous_hash === previousHash.current_hash;
};

/**
 * Retourne représentation JSON sécurisée
 * @returns {Object}
 */
HashChain.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Tronquer les hash pour l'affichage
  return {
    ...values,
    current_hash_short: values.current_hash ? values.current_hash.substring(0, 16) + '...' : null,
    previous_hash_short: values.previous_hash ? values.previous_hash.substring(0, 16) + '...' : null,
  };
};

module.exports = HashChain;
