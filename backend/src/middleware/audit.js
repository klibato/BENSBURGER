const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware pour logger automatiquement certaines actions
 * À utiliser sur des routes spécifiques qui nécessitent un audit
 */
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Capturer la réponse originale
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Logger l'action uniquement si la requête a réussi
      if (data.success && req.user) {
        // Extraire l'ID de l'entité depuis la réponse ou les params
        const entityId = data.data?.id || req.params.id || null;

        // Extraire les détails pertinents
        const details = {
          newValues: data.data || null,
        };

        // Logger de manière asynchrone (ne pas bloquer la réponse)
        setImmediate(async () => {
          try {
            await AuditLog.log({
              organizationId: req.organizationId || req.user.organization_id || 1, // MULTI-TENANT: REQUIS
              userId: req.user.id,
              action,
              entityType,
              entityId,
              details,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
            });
          } catch (error) {
            logger.error('Erreur lors du logging d\'audit:', error);
          }
        });
      }

      // Appeler la méthode originale
      return originalJson(data);
    };

    next();
  };
};

/**
 * Helper pour logger manuellement une action
 */
const logAction = async (req, action, entityType, entityId, details = null) => {
  try {
    await AuditLog.log({
      organizationId: req.organizationId || req.user?.organization_id || 1, // MULTI-TENANT: REQUIS
      userId: req.user?.id || null,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    logger.error('Erreur lors du logging manuel d\'audit:', error);
  }
};

module.exports = {
  auditMiddleware,
  logAction,
};
