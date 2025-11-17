const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model NF525Archive - Archives certifiées pour conformité fiscale
 * Conservation légale: 6 ans minimum (article L123-22 du Code de commerce)
 *
 * Génère des archives ZIP certifiées contenant:
 * - Toutes les ventes de la période
 * - Hash chain complet
 * - Métadonnées fiscales
 * - Signature numérique (optionnel)
 */
class NF525Archive extends Model {}

NF525Archive.init(
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
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date début période archivée (YYYY-MM-DD)',
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterStart(value) {
          if (value < this.period_start) {
            throw new Error('period_end must be >= period_start');
          }
        },
      },
      comment: 'Date fin période archivée (YYYY-MM-DD)',
    },
    archive_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'monthly',
      allowNull: false,
      validate: {
        isIn: [['daily', 'weekly', 'monthly', 'yearly', 'custom']],
      },
      comment: 'Type d\'archive (daily, weekly, monthly, yearly, custom)',
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Chemin relatif ou absolu du fichier ZIP',
    },
    file_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        len: [64, 64],
        isHexadecimal: true,
      },
      comment: 'Hash SHA-256 du fichier ZIP (garantit intégrité)',
    },
    file_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1,
      },
      comment: 'Taille du fichier en octets',
    },
    total_sales: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: 'Nombre total de ventes dans l\'archive',
    },
    total_amount_ttc: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: 'Montant total TTC de la période',
    },
    total_amount_ht: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: 'Montant total HT de la période',
    },
    first_sequence_number: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Premier numéro de séquence hash dans l\'archive',
    },
    last_sequence_number: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isGreaterOrEqual(value) {
          if (value && this.first_sequence_number && value < this.first_sequence_number) {
            throw new Error('last_sequence_number must be >= first_sequence_number');
          }
        },
      },
      comment: 'Dernier numéro de séquence hash dans l\'archive',
    },
    certified_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date/heure de certification de l\'archive',
    },
    certificate_authority: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Autorité de certification (ex: ChamberSign France)',
    },
    archive_signature: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Signature numérique RSA de l\'archive complète',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'generated',
      allowNull: false,
      validate: {
        isIn: [['generated', 'downloaded', 'verified', 'archived_offsite', 'deleted']],
      },
      comment: 'Statut de l\'archive',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'Utilisateur ayant créé l\'archive',
    },
    downloaded_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date/heure du premier téléchargement',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date/heure de suppression logique',
    },
  },
  {
    sequelize,
    modelName: 'NF525Archive',
    tableName: 'nf525_archives',
    timestamps: true, // created_at seulement
    updatedAt: false, // Pas de updatedAt (archives immuables après création)
    paranoid: false, // On utilise deleted_at manuel au lieu de paranoid
    indexes: [
      {
        name: 'idx_archives_org',
        fields: ['organization_id'],
      },
      {
        name: 'idx_archives_period',
        fields: ['organization_id', 'period_start', 'period_end'],
      },
      {
        name: 'idx_archives_status',
        fields: ['status'],
      },
      {
        name: 'idx_archives_type',
        fields: ['archive_type'],
      },
      {
        name: 'idx_archives_created',
        fields: ['created_at'],
      },
    ],
    comment: 'Archives certifiées NF525 - Conservation légale 6 ans minimum',
  }
);

/**
 * Hooks Sequelize
 */

/**
 * Avant création: Valider cohérence données
 */
NF525Archive.beforeCreate(async (archive) => {
  // Valider période
  if (archive.period_end < archive.period_start) {
    throw new Error('period_end must be >= period_start');
  }

  // Valider séquences
  if (
    (archive.first_sequence_number && !archive.last_sequence_number) ||
    (!archive.first_sequence_number && archive.last_sequence_number)
  ) {
    throw new Error('first_sequence_number and last_sequence_number must be both set or both null');
  }

  if (
    archive.first_sequence_number &&
    archive.last_sequence_number &&
    archive.last_sequence_number < archive.first_sequence_number
  ) {
    throw new Error('last_sequence_number must be >= first_sequence_number');
  }
});

/**
 * Méthodes de classe utilitaires
 */

/**
 * Récupère les archives actives d'une organisation
 * @param {Number} organizationId
 * @param {Object} options - Filtres optionnels (status, archive_type, etc.)
 * @returns {Promise<Array<NF525Archive>>}
 */
NF525Archive.getActiveArchives = async function (organizationId, options = {}) {
  const where = {
    organization_id: organizationId,
    deleted_at: null,
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.archive_type) {
    where.archive_type = options.archive_type;
  }

  return await this.findAll({
    where,
    order: [['period_end', 'DESC']],
    limit: options.limit || undefined,
  });
};

/**
 * Trouve une archive couvrant une date spécifique
 * @param {Number} organizationId
 * @param {Date|String} date - Date à rechercher (YYYY-MM-DD)
 * @returns {Promise<NF525Archive|null>}
 */
NF525Archive.findArchiveForDate = async function (organizationId, date) {
  return await this.findOne({
    where: {
      organization_id: organizationId,
      period_start: { [sequelize.Op.lte]: date },
      period_end: { [sequelize.Op.gte]: date },
      deleted_at: null,
    },
    order: [['created_at', 'DESC']],
  });
};

/**
 * Statistiques archives pour une organisation
 * @param {Number} organizationId
 * @returns {Promise<Object>}
 */
NF525Archive.getStats = async function (organizationId) {
  const [stats] = await sequelize.query(`
    SELECT
      COUNT(*) as total_archives,
      COUNT(CASE WHEN status = 'generated' THEN 1 END) as generated_count,
      COUNT(CASE WHEN status = 'downloaded' THEN 1 END) as downloaded_count,
      COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_count,
      SUM(total_sales) as total_sales_archived,
      SUM(total_amount_ttc) as total_amount_ttc_archived,
      SUM(file_size_bytes) as total_storage_bytes,
      MIN(period_start) as oldest_archive_date,
      MAX(period_end) as newest_archive_date
    FROM nf525_archives
    WHERE organization_id = ?
      AND deleted_at IS NULL
  `, {
    replacements: [organizationId],
    type: sequelize.QueryTypes.SELECT,
  });

  return stats || {
    total_archives: 0,
    generated_count: 0,
    downloaded_count: 0,
    verified_count: 0,
    total_sales_archived: 0,
    total_amount_ttc_archived: 0,
    total_storage_bytes: 0,
    oldest_archive_date: null,
    newest_archive_date: null,
  };
};

/**
 * Méthodes d'instance
 */

/**
 * Marque l'archive comme téléchargée
 * @returns {Promise<NF525Archive>}
 */
NF525Archive.prototype.markAsDownloaded = async function () {
  if (!this.downloaded_at) {
    this.downloaded_at = new Date();
  }
  if (this.status === 'generated') {
    this.status = 'downloaded';
  }
  return await this.save();
};

/**
 * Suppression logique de l'archive
 * ⚠️ ATTENTION: Conservation légale 6 ans obligatoire!
 * @param {String} reason - Raison de suppression (audit)
 * @returns {Promise<NF525Archive>}
 */
NF525Archive.prototype.softDelete = async function (reason = null) {
  // Vérifier période de conservation légale (6 ans = 2190 jours)
  const createdDate = new Date(this.created_at);
  const now = new Date();
  const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

  if (daysSinceCreation < 2190) {
    const remainingDays = 2190 - daysSinceCreation;
    throw new Error(
      `Cannot delete archive: Legal retention period not met. ` +
      `${remainingDays} days remaining (6 years required).`
    );
  }

  this.deleted_at = new Date();
  this.status = 'deleted';
  return await this.save();
};

/**
 * Calcule la durée de la période en jours
 * @returns {Number}
 */
NF525Archive.prototype.getPeriodDurationDays = function () {
  const start = new Date(this.period_start);
  const end = new Date(this.period_end);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Formate la taille du fichier en human-readable
 * @returns {String}
 */
NF525Archive.prototype.getFormattedFileSize = function () {
  const bytes = parseInt(this.file_size_bytes);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * Retourne représentation JSON enrichie
 * @returns {Object}
 */
NF525Archive.prototype.toJSON = function () {
  const values = { ...this.get() };
  return {
    ...values,
    file_size_formatted: this.getFormattedFileSize(),
    period_duration_days: this.getPeriodDurationDays(),
    file_hash_short: values.file_hash ? values.file_hash.substring(0, 16) + '...' : null,
    is_downloadable: values.status !== 'deleted' && values.deleted_at === null,
    legal_retention_expires_at: new Date(new Date(values.created_at).getTime() + 2190 * 24 * 60 * 60 * 1000),
  };
};

module.exports = NF525Archive;
