const { DailyReport } = require('../models');
const logger = require('../utils/logger');
const { logAction } = require('../middlewares/audit');

/**
 * Daily Report Controller - Rapports Z (Clôture journalière NF525)
 * Conforme décret n°2016-1551
 *
 * Endpoints:
 * - POST /api/daily-reports/generate - Générer rapport Z pour une date
 * - GET /api/daily-reports - Liste des rapports
 * - GET /api/daily-reports/:id - Détail d'un rapport
 */

/**
 * Générer un rapport Z pour une date
 * POST /api/daily-reports/generate
 * Body: { report_date: "2025-11-20" }
 */
const generateDailyReport = async (req, res, next) => {
  try {
    const { report_date } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user.id;

    // Validation
    if (!report_date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REPORT_DATE',
          message: 'La date du rapport est requise (format: YYYY-MM-DD)',
        },
      });
    }

    // Vérifier que la date n'est pas future
    const reportDate = new Date(report_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reportDate > today) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'FUTURE_DATE_NOT_ALLOWED',
          message: 'Impossible de générer un rapport pour une date future',
        },
      });
    }

    logger.info(
      `Génération rapport Z pour org ${organizationId} date ${report_date} par ${req.user.username}`
    );

    // Générer le rapport
    const report = await DailyReport.generateForDate(organizationId, report_date, userId);

    // Audit logging
    setImmediate(() => {
      logAction(req, 'GENERATE_DAILY_REPORT', 'daily_report', report.id, {
        report_date,
        total_sales_count: report.total_sales_count,
        total_amount_ttc: report.total_amount_ttc,
      });
    });

    logger.info(
      `✅ Rapport Z généré: ID ${report.id}, ${report.total_sales_count} ventes, ${report.total_amount_ttc}€`
    );

    res.status(201).json({
      success: true,
      data: report,
      message: 'Rapport Z généré avec succès',
    });
  } catch (error) {
    // Si rapport déjà existant
    if (error.message.includes('already exists')) {
      logger.warn(`Rapport Z déjà existant: ${error.message}`);
      return res.status(409).json({
        success: false,
        error: {
          code: 'REPORT_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    logger.error('Erreur lors de la génération du rapport Z:', error);
    next(error);
  }
};

/**
 * Récupérer la liste des rapports Z
 * GET /api/daily-reports
 * Query params: start_date, end_date, limit, offset
 */
const getAllDailyReports = async (req, res, next) => {
  try {
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;
    const organizationId = req.organizationId;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    if (start_date) {
      options.startDate = start_date;
    }

    if (end_date) {
      options.endDate = end_date;
    }

    const reports = await DailyReport.getReports(organizationId, options);

    // Compter le total
    const where = {
      organization_id: organizationId,
    };

    if (start_date) {
      where.report_date = {
        ...where.report_date,
        [require('sequelize').Op.gte]: start_date,
      };
    }

    if (end_date) {
      where.report_date = {
        ...where.report_date,
        [require('sequelize').Op.lte]: end_date,
      };
    }

    const total = await DailyReport.count({ where });

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: total > parseInt(offset) + parseInt(limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des rapports Z:', error);
    next(error);
  }
};

/**
 * Récupérer un rapport Z par ID
 * GET /api/daily-reports/:id
 */
const getDailyReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    const report = await DailyReport.findOne({
      where: {
        id,
        organization_id: organizationId,
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Rapport Z introuvable',
        },
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du rapport Z:', error);
    next(error);
  }
};

/**
 * Récupérer un rapport Z par date
 * GET /api/daily-reports/by-date/:date
 */
const getDailyReportByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    const organizationId = req.organizationId;

    const report = await DailyReport.findOne({
      where: {
        report_date: date,
        organization_id: organizationId,
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Aucun rapport Z trouvé pour la date ${date}`,
        },
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du rapport Z par date:', error);
    next(error);
  }
};

/**
 * Exporter les rapports Z en CSV
 * GET /api/daily-reports/export/csv
 * Query params: start_date, end_date
 */
const exportDailyReportsCSV = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const organizationId = req.organizationId;

    const options = {};
    if (start_date) options.startDate = start_date;
    if (end_date) options.endDate = end_date;

    const reports = await DailyReport.getReports(organizationId, options);

    // Formater en CSV
    const csvRows = [];

    // Header
    csvRows.push([
      'Date',
      'Nombre ventes',
      'Total TTC (€)',
      'Total HT (€)',
      'Total TVA (€)',
      'Espèces (€)',
      'Carte (€)',
      'Tickets restaurant (€)',
      'Paiements mixtes (€)',
      'Premier ticket',
      'Dernier ticket',
      'Première séquence hash',
      'Dernière séquence hash',
      'Signature hash',
      'Statut',
      'Créé le',
    ].join(';'));

    // Lignes de données
    reports.forEach((report) => {
      const date = new Date(report.report_date).toLocaleDateString('fr-FR');
      const createdAt = new Date(report.created_at).toLocaleString('fr-FR');

      csvRows.push([
        date,
        report.total_sales_count,
        parseFloat(report.total_amount_ttc).toFixed(2),
        parseFloat(report.total_amount_ht).toFixed(2),
        parseFloat(report.total_tax).toFixed(2),
        parseFloat(report.total_cash).toFixed(2),
        parseFloat(report.total_card).toFixed(2),
        parseFloat(report.total_meal_voucher).toFixed(2),
        parseFloat(report.total_mixed).toFixed(2),
        report.first_ticket_number || '',
        report.last_ticket_number || '',
        report.first_hash_sequence || '',
        report.last_hash_sequence || '',
        report.signature_hash,
        report.status,
        createdAt,
      ].join(';'));
    });

    const csvContent = csvRows.join('\n');

    // Générer le nom de fichier
    const today = new Date().toISOString().split('T')[0];
    const filename = `rapports_z_${today}.csv`;

    // Headers pour le téléchargement CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Ajouter le BOM UTF-8 pour Excel
    res.write('\ufeff');
    res.end(csvContent);

    logger.info(`Export CSV rapports Z généré par ${req.user.username}: ${reports.length} rapports`);
  } catch (error) {
    logger.error('Erreur lors de l\'export CSV des rapports Z:', error);
    next(error);
  }
};

module.exports = {
  generateDailyReport,
  getAllDailyReports,
  getDailyReportById,
  getDailyReportByDate,
  exportDailyReportsCSV,
};
