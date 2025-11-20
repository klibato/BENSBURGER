const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model DailyReport - Rapport Z (Clôture journalière NF525)
 * Conforme décret n°2016-1551 (article 286 du CGI)
 *
 * Génère un rapport quotidien des ventes avec:
 * - Totaux journaliers (CA, nombre de ventes)
 * - Détail par mode de paiement
 * - Hash SHA-256 pour garantir l'intégrité
 * - Immutabilité après création
 *
 * ⚠️ IMMUABLE: Aucune modification autorisée après création (sauf statut)
 */
class DailyReport extends Model {}

DailyReport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id',
      },
      comment: 'Organisation (multi-tenant)',
    },
    report_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date du rapport (unique par organisation)',
    },
    total_sales_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Nombre total de ventes de la journée',
    },
    total_amount_ttc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Montant total TTC',
    },
    total_amount_ht: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Montant total HT',
    },
    total_tax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Montant total TVA',
    },
    total_cash: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total espèces',
    },
    total_card: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total carte bancaire',
    },
    total_meal_voucher: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total tickets restaurant',
    },
    total_mixed: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total paiements mixtes',
    },
    vat_breakdown: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Détail TVA par taux (JSON)',
    },
    first_sale_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Heure de la première vente',
    },
    last_sale_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Heure de la dernière vente',
    },
    first_ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Numéro du premier ticket',
    },
    last_ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Numéro du dernier ticket',
    },
    first_hash_sequence: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Premier numéro séquence hash_chain',
    },
    last_hash_sequence: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Dernier numéro séquence hash_chain',
    },
    signature_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        len: [64, 64],
        isHexadecimal: true,
      },
      comment: 'Hash SHA-256 NF525 du rapport',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'generated',
      validate: {
        isIn: [['generated', 'verified', 'archived']],
      },
      comment: 'Statut du rapport',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Métadonnées supplémentaires',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'Utilisateur ayant créé le rapport',
    },
  },
  {
    sequelize,
    modelName: 'DailyReport',
    tableName: 'daily_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Pas de updatedAt (immuable)
    paranoid: false, // Pas de soft delete (immuable)
    underscored: true,
    indexes: [
      {
        name: 'idx_daily_reports_org',
        fields: ['organization_id'],
      },
      {
        name: 'idx_daily_reports_date',
        fields: [{ attribute: 'report_date', order: 'DESC' }],
      },
      {
        name: 'uq_daily_report_org_date',
        fields: ['organization_id', 'report_date'],
        unique: true,
      },
    ],
    comment: 'Rapports Z (clôture journalière) - Conformité NF525',
  }
);

/**
 * Hooks Sequelize
 */

/**
 * beforeUpdate: Protéger immutabilité (NF525)
 * Seul le statut peut être modifié
 */
DailyReport.beforeUpdate((report) => {
  const changed = report.changed() || [];
  const immutableFields = [
    'organization_id',
    'report_date',
    'total_sales_count',
    'total_amount_ttc',
    'total_amount_ht',
    'total_tax',
    'total_cash',
    'total_card',
    'total_meal_voucher',
    'total_mixed',
    'vat_breakdown',
    'first_sale_time',
    'last_sale_time',
    'first_ticket_number',
    'last_ticket_number',
    'first_hash_sequence',
    'last_hash_sequence',
    'signature_hash',
    'created_by',
  ];

  const forbiddenChanges = changed.filter((field) => immutableFields.includes(field));

  if (forbiddenChanges.length > 0) {
    throw new Error(
      `NF525 Compliance: Daily reports are immutable. ` +
        `Cannot modify: ${forbiddenChanges.join(', ')}. ` +
        `Only status can be updated.`
    );
  }
});

/**
 * Méthodes de classe
 */

/**
 * Génère un rapport Z pour une organisation et une date
 * @param {Number} organizationId
 * @param {Date|String} reportDate - Date au format YYYY-MM-DD
 * @param {Number} userId - ID utilisateur créant le rapport
 * @returns {Promise<DailyReport>}
 */
DailyReport.generateForDate = async function (organizationId, reportDate, userId = null) {
  const { Sale, HashChain } = require('./index');
  const crypto = require('crypto');

  // Vérifier si le rapport existe déjà
  const existingReport = await this.findOne({
    where: {
      organization_id: organizationId,
      report_date: reportDate,
    },
  });

  if (existingReport) {
    throw new Error(
      `Daily report already exists for ${reportDate} (ID: ${existingReport.id})`
    );
  }

  // Calculer les totaux des ventes de la journée
  const sales = await Sale.findAll({
    where: {
      organization_id: organizationId,
      created_at: {
        [sequelize.Op.gte]: `${reportDate} 00:00:00`,
        [sequelize.Op.lt]: `${reportDate} 23:59:59`,
      },
      status: 'completed',
    },
    order: [['created_at', 'ASC']],
  });

  const totalSalesCount = sales.length;
  let totalAmountTTC = 0;
  let totalAmountHT = 0;
  let totalCash = 0;
  let totalCard = 0;
  let totalMealVoucher = 0;
  let totalMixed = 0;

  sales.forEach((sale) => {
    const ttc = parseFloat(sale.total_ttc);
    const ht = parseFloat(sale.total_ht);

    totalAmountTTC += ttc;
    totalAmountHT += ht;

    if (sale.payment_method === 'cash') totalCash += ttc;
    else if (sale.payment_method === 'card') totalCard += ttc;
    else if (sale.payment_method === 'meal_voucher') totalMealVoucher += ttc;
    else if (sale.payment_method === 'mixed') totalMixed += ttc;
  });

  const totalTax = totalAmountTTC - totalAmountHT;

  // Récupérer les séquences hash
  let firstHashSeq = null;
  let lastHashSeq = null;

  if (sales.length > 0) {
    const firstSaleId = sales[0].id;
    const lastSaleId = sales[sales.length - 1].id;

    const firstHash = await HashChain.findOne({
      where: { sale_id: firstSaleId },
      attributes: ['sequence_number'],
    });

    const lastHash = await HashChain.findOne({
      where: { sale_id: lastSaleId },
      attributes: ['sequence_number'],
    });

    firstHashSeq = firstHash?.sequence_number || null;
    lastHashSeq = lastHash?.sequence_number || null;
  }

  // Calculer le hash SHA-256
  const dataToHash = [
    String(organizationId),
    String(reportDate),
    String(totalSalesCount),
    totalAmountTTC.toFixed(2),
    String(firstHashSeq || 0),
    String(lastHashSeq || 0),
  ].join('|');

  const signatureHash = crypto.createHash('sha256').update(dataToHash, 'utf8').digest('hex');

  // Créer le rapport
  const report = await this.create({
    organization_id: organizationId,
    report_date: reportDate,
    total_sales_count: totalSalesCount,
    total_amount_ttc: totalAmountTTC.toFixed(2),
    total_amount_ht: totalAmountHT.toFixed(2),
    total_tax: totalTax.toFixed(2),
    total_cash: totalCash.toFixed(2),
    total_card: totalCard.toFixed(2),
    total_meal_voucher: totalMealVoucher.toFixed(2),
    total_mixed: totalMixed.toFixed(2),
    vat_breakdown: {},
    first_sale_time: sales.length > 0 ? sales[0].created_at : null,
    last_sale_time: sales.length > 0 ? sales[sales.length - 1].created_at : null,
    first_ticket_number: sales.length > 0 ? sales[0].ticket_number : null,
    last_ticket_number: sales.length > 0 ? sales[sales.length - 1].ticket_number : null,
    first_hash_sequence: firstHashSeq,
    last_hash_sequence: lastHashSeq,
    signature_hash: signatureHash,
    created_by: userId,
  });

  return report;
};

/**
 * Récupère les rapports d'une organisation
 * @param {Number} organizationId
 * @param {Object} options - Filtres (startDate, endDate, limit, offset)
 * @returns {Promise<Array<DailyReport>>}
 */
DailyReport.getReports = async function (organizationId, options = {}) {
  const where = {
    organization_id: organizationId,
  };

  if (options.startDate) {
    where.report_date = {
      ...where.report_date,
      [sequelize.Op.gte]: options.startDate,
    };
  }

  if (options.endDate) {
    where.report_date = {
      ...where.report_date,
      [sequelize.Op.lte]: options.endDate,
    };
  }

  return await this.findAll({
    where,
    order: [['report_date', 'DESC']],
    limit: options.limit || undefined,
    offset: options.offset || undefined,
  });
};

/**
 * Méthodes d'instance
 */

/**
 * Retourne JSON pour affichage
 * @returns {Object}
 */
DailyReport.prototype.toJSON = function () {
  const values = { ...this.get() };
  return {
    ...values,
    signature_hash_short: values.signature_hash ? values.signature_hash.substring(0, 16) + '...' : null,
  };
};

module.exports = DailyReport;
