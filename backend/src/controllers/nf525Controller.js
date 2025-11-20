const { HashChain, Sale, SaleItem } = require('../models');
const NF525Service = require('../services/nf525Service');
const logger = require('../utils/logger');
const { logAction } = require('../middlewares/audit');

/**
 * NF525 Controller - Endpoints d'administration pour conformité fiscale
 * Conforme décret n°2016-1551 (anti-fraude TVA)
 *
 * Endpoints:
 * - GET /api/admin/nf525/verify-integrity - Vérifier intégrité chaîne de hash
 * - GET /api/admin/nf525/stats - Statistiques NF525
 * - GET /api/admin/nf525/export - Exporter archive fiscale
 */

/**
 * Vérifier l'intégrité de la chaîne de hash NF525
 * Route: GET /api/admin/nf525/verify-integrity
 * Query params:
 *  - limit (optionnel): nombre d'entrées à vérifier (pagination)
 *  - offset (optionnel): offset pour pagination
 *
 * Vérifie:
 * 1. Chaînage correct (previous_hash = current_hash précédent)
 * 2. Aucune altération des données (recalcul hash)
 * 3. Séquence continue (1, 2, 3... N)
 */
const verifyIntegrity = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    const { limit, offset } = req.query;

    logger.info(`🔍 NF525: Vérification intégrité demandée par ${req.user.username} (org: ${organizationId})`);

    // Options pagination
    const options = {};
    if (limit) {
      options.limit = parseInt(limit, 10);
    }
    if (offset) {
      options.offset = parseInt(offset, 10);
    }

    // Vérifier intégrité
    const result = await NF525Service.verifyHashChainIntegrity(organizationId, options);

    // Audit logging
    await logAction(req, 'nf525_verify_integrity', {
      organization_id: organizationId,
      total_checked: result.totalChecked,
      valid: result.valid,
      broken_at: result.brokenAt,
    });

    if (!result.valid) {
      logger.error(`❌ NF525: Intégrité compromise à séquence ${result.brokenAt} (org: ${organizationId})`);
      return res.status(500).json({
        success: false,
        valid: false,
        error: {
          code: 'NF525_INTEGRITY_COMPROMISED',
          message: result.message,
          brokenAt: result.brokenAt,
          totalChecked: result.totalChecked,
          details: result.details,
        },
      });
    }

    logger.info(`✅ NF525: Intégrité vérifiée - ${result.totalChecked} entrées (org: ${organizationId})`);

    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        totalChecked: result.totalChecked,
        message: result.message,
        verifiedAt: new Date().toISOString(),
        organizationId,
      },
    });
  } catch (error) {
    logger.error('❌ NF525: Erreur vérification intégrité:', error);
    next(error);
  }
};

/**
 * Récupérer les statistiques NF525 pour l'organisation
 * Route: GET /api/admin/nf525/stats
 *
 * Retourne:
 * - Nombre total d'entrées hash_chain
 * - Première et dernière séquence
 * - Date première et dernière certification
 * - Statut global de conformité
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;

    logger.info(`📊 NF525: Statistiques demandées par ${req.user.username} (org: ${organizationId})`);

    // Récupérer statistiques
    const stats = await HashChain.getStats(organizationId);

    // Vérifier si la chaîne existe
    const hasEntries = stats.total_entries > 0;

    // Audit logging
    await logAction(req, 'nf525_get_stats', {
      organization_id: organizationId,
      total_entries: stats.total_entries,
    });

    return res.status(200).json({
      success: true,
      data: {
        organizationId,
        totalEntries: parseInt(stats.total_entries, 10) || 0,
        firstSequence: stats.first_sequence,
        lastSequence: stats.last_sequence,
        firstSaleDate: stats.first_sale_date,
        lastSaleDate: stats.last_sale_date,
        status: hasEntries ? 'active' : 'empty',
        compliance: {
          nf525Enabled: true,
          algorithm: 'SHA-256',
          regulation: 'Décret n°2016-1551',
        },
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ NF525: Erreur récupération statistiques:', error);
    next(error);
  }
};

/**
 * Exporter l'archive fiscale NF525
 * Route: GET /api/admin/nf525/export
 * Query params:
 *  - format (optionnel): 'json' ou 'csv' (défaut: 'json')
 *  - startDate (optionnel): date de début (ISO 8601)
 *  - endDate (optionnel): date de fin (ISO 8601)
 *
 * Export conforme pour audit fiscal:
 * - Format JSON ou CSV
 * - Toutes les entrées hash_chain avec métadonnées
 * - Filtrage par période optionnel
 */
const exportArchive = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    const { format = 'json', startDate, endDate } = req.query;

    logger.info(
      `📦 NF525: Export archive demandé par ${req.user.username} (org: ${organizationId}, format: ${format})`
    );

    // Valider format
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: "Format invalide. Utilisez 'json' ou 'csv'",
        },
      });
    }

    // Construire query avec filtres optionnels
    const where = { organization_id: organizationId };

    if (startDate || endDate) {
      where.certified_timestamp = {};
      if (startDate) {
        where.certified_timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        where.certified_timestamp.$lte = new Date(endDate);
      }
    }

    // Récupérer toutes les entrées hash_chain avec ventes associées
    const entries = await HashChain.findAll({
      where,
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: [
            'id',
            'ticket_number',
            'organization_id',
            'total_ttc',
            'total_ht',
            'payment_method',
            'created_at',
          ],
          include: [
            {
              model: SaleItem,
              as: 'items',
              attributes: ['id', 'product_name', 'quantity', 'unit_price_ht', 'vat_rate', 'total_ht', 'total_ttc'],
            },
          ],
        },
      ],
      order: [['sequence_number', 'ASC']],
    });

    // Audit logging
    await logAction(req, 'nf525_export_archive', {
      organization_id: organizationId,
      format,
      total_entries: entries.length,
      start_date: startDate,
      end_date: endDate,
    });

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'Aucune donnée NF525 trouvée pour la période demandée',
        },
      });
    }

    // Export JSON
    if (format === 'json') {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          organizationId,
          totalEntries: entries.length,
          startDate,
          endDate,
          regulation: 'Décret n°2016-1551 - Loi Anti-Fraude TVA',
          algorithm: 'SHA-256',
        },
        entries: entries.map((entry) => ({
          sequence_number: entry.sequence_number,
          sale_id: entry.sale_id,
          ticket_number: entry.sale?.ticket_number,
          current_hash: entry.current_hash,
          previous_hash: entry.previous_hash,
          certified_timestamp: entry.certified_timestamp,
          sale_data: {
            total_ttc: entry.sale?.total_ttc,
            total_ht: entry.sale?.total_ht,
            payment_method: entry.sale?.payment_method,
            created_at: entry.sale?.created_at,
          },
        })),
      };

      logger.info(`✅ NF525: Export JSON généré - ${entries.length} entrées (org: ${organizationId})`);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nf525_archive_org${organizationId}_${Date.now()}.json"`
      );
      return res.status(200).json(exportData);
    }

    // Export CSV
    if (format === 'csv') {
      // Header CSV
      const csvHeader = [
        'sequence_number',
        'sale_id',
        'ticket_number',
        'total_ttc',
        'total_ht',
        'payment_method',
        'current_hash',
        'previous_hash',
        'certified_timestamp',
      ].join(',');

      // Lignes CSV
      const csvRows = entries.map((entry) => {
        return [
          entry.sequence_number,
          entry.sale_id,
          entry.sale?.ticket_number || 'N/A',
          entry.sale?.total_ttc || '0.00',
          entry.sale?.total_ht || '0.00',
          entry.sale?.payment_method || 'unknown',
          entry.current_hash,
          entry.previous_hash || '0'.repeat(64),
          entry.certified_timestamp.toISOString(),
        ].join(',');
      });

      const csvContent = [csvHeader, ...csvRows].join('\n');

      logger.info(`✅ NF525: Export CSV généré - ${entries.length} entrées (org: ${organizationId})`);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nf525_archive_org${organizationId}_${Date.now()}.csv"`
      );
      return res.status(200).send(csvContent);
    }
  } catch (error) {
    logger.error('❌ NF525: Erreur export archive:', error);
    next(error);
  }
};

module.exports = {
  verifyIntegrity,
  getStats,
  exportArchive,
};
