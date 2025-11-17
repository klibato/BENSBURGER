const { AuditLog, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Récupérer tous les logs d'audit avec filtres
 */
const getAllLogs = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      user_id,
      action,
      entity_type,
      limit = 100,
      offset = 0,
    } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    // Filtres par date
    if (start_date) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(start_date),
      };
    }

    if (end_date) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(end_date),
      };
    }

    // Filtre par utilisateur
    if (user_id) {
      where.user_id = user_id;
    }

    // Filtre par type d'action
    if (action) {
      where.action = action;
    }

    // Filtre par type d'entité
    if (entity_type) {
      where.entity_type = entity_type;
    }

    // Récupérer les logs avec les infos utilisateur
    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name', 'role'],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: count > parseInt(offset) + parseInt(limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des logs:', error);
    next(error);
  }
};

/**
 * Récupérer les statistiques des logs
 */
const getLogsStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    if (start_date) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(start_date),
      };
    }

    if (end_date) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(end_date),
      };
    }

    // Statistiques par action
    const actionStats = await AuditLog.findAll({
      where,
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['action'],
      raw: true,
    });

    // Statistiques par utilisateur
    const userStats = await AuditLog.findAll({
      where,
      attributes: [
        'user_id',
        [sequelize.fn('COUNT', sequelize.col('audit_logs.id')), 'count'],
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'first_name', 'last_name'],
        },
      ],
      group: ['user_id', 'user.id', 'user.username', 'user.first_name', 'user.last_name'],
      raw: false,
    });

    // Statistiques par type d'entité
    const entityStats = await AuditLog.findAll({
      where,
      attributes: [
        'entity_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['entity_type'],
      raw: true,
    });

    // Total des logs
    const totalLogs = await AuditLog.count({ where });

    res.json({
      success: true,
      data: {
        total_logs: totalLogs,
        by_action: actionStats,
        by_user: userStats,
        by_entity: entityStats,
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des stats logs:', error);
    next(error);
  }
};

/**
 * Exporter les logs en CSV
 */
const exportLogsCSV = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      user_id,
      action,
      entity_type,
    } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    // Mêmes filtres que getAllLogs
    if (start_date) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(start_date),
      };
    }

    if (end_date) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(end_date),
      };
    }

    if (user_id) {
      where.user_id = user_id;
    }

    if (action) {
      where.action = action;
    }

    if (entity_type) {
      where.entity_type = entity_type;
    }

    // Récupérer tous les logs (pas de limit pour l'export)
    const logs = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'first_name', 'last_name', 'role'],
        },
      ],
    });

    // Formater en CSV
    const csvRows = [];

    // Header
    csvRows.push([
      'Date',
      'Utilisateur',
      'Rôle',
      'Action',
      'Type d\'entité',
      'ID entité',
      'IP',
      'User Agent',
    ].join(';'));

    // Lignes de données
    logs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const username = log.user
        ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() || log.user.username
        : 'Système';

      const role = log.user?.role || 'N/A';
      const action = log.action;
      const entityType = log.entity_type || 'N/A';
      const entityId = log.entity_id || 'N/A';
      const ipAddress = log.ip_address || 'N/A';
      const userAgent = log.user_agent ? `"${log.user_agent.substring(0, 50)}..."` : 'N/A';

      csvRows.push([
        date,
        username,
        role,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
      ].join(';'));
    });

    const csvContent = csvRows.join('\n');

    // Générer le nom de fichier avec la date du jour
    const today = new Date().toISOString().split('T')[0];
    const filename = `logs_audit_${today}.csv`;

    // Headers pour le téléchargement CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Ajouter le BOM UTF-8 pour Excel
    res.write('\ufeff');
    res.end(csvContent);

    logger.info(`Export CSV logs généré par ${req.user.username}: ${logs.length} logs`);
  } catch (error) {
    logger.error('Erreur lors de l\'export CSV logs:', error);
    next(error);
  }
};

module.exports = {
  getAllLogs,
  getLogsStats,
  exportLogsCSV,
};
