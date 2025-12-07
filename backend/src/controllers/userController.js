const { User, Sale, AuditLog } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Récupérer tous les utilisateurs
 */
const getAllUsers = async (req, res, next) => {
  try {
    const {
      include_inactive = 'false',
      limit = 50,
      offset = 0,
    } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    // Par défaut, ne montrer que les utilisateurs actifs
    // Seulement un admin peut voir les utilisateurs inactifs
    if (include_inactive !== 'true') {
      where.is_active = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['pin_code'] }, // Ne pas exposer les PIN hashés
      order: [
        ['role', 'ASC'],
        ['last_name', 'ASC'],
        ['first_name', 'ASC'],
      ],
    });

    // Rétrocompatibilité: retourner array directement + pagination en headers
    res.set('X-Total-Count', count);
    res.set('X-Pagination-Limit', limit);
    res.set('X-Pagination-Offset', offset);

    res.json({
      success: true,
      data: users, // Array direct pour compatibilité frontend
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    next(error);
  }
};

/**
 * Récupérer un utilisateur par ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
      attributes: { exclude: ['pin_code'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
    next(error);
  }
};

/**
 * Créer un nouvel utilisateur
 */
const createUser = async (req, res, next) => {
  try {
    const {
      username,
      pin_code,
      first_name,
      last_name,
      email,
      role = 'cashier',
      is_active = true,
    } = req.body;

    // Validation
    if (!username || !pin_code || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Les champs username, pin_code, first_name et last_name sont obligatoires',
        },
      });
    }

    // ✅ P1-1: Validation du PIN (6 chiffres minimum - sécurité anti-brute-force)
    if (!/^\d{6,}$/.test(pin_code)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le code PIN doit contenir au moins 6 chiffres',
        },
      });
    }

    // Vérifier si le username existe déjà DANS L'ORGANISATION
    const existingUser = await User.findOne({
      where: {
        username,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier dans l'organisation
      },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_USERNAME',
          message: 'Ce nom d\'utilisateur existe déjà dans votre organisation',
        },
      });
    }

    // Créer l'utilisateur
    // Note: Le PIN sera hashé automatiquement par le hook beforeCreate du modèle User
    const user = await User.create({
      organization_id: req.organizationId, // MULTI-TENANT: Associer à l'organisation
      username,
      pin_code,
      first_name,
      last_name,
      email: email || null,
      role,
      is_active,
    });

    // Retourner sans le PIN hashé
    const userResponse = user.toJSON();
    delete userResponse.pin_code;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'Utilisateur créé avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    next(error);
  }
};

/**
 * Modifier un utilisateur
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      username,
      pin_code,
      first_name,
      last_name,
      email,
      role,
      is_active,
    } = req.body;

    const user = await User.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier si le username est déjà pris par un autre utilisateur DANS L'ORGANISATION
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        where: {
          username,
          organization_id: req.organizationId, // MULTI-TENANT: Dans la même organisation
          id: { [Op.ne]: id },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_USERNAME',
            message: 'Ce nom d\'utilisateur existe déjà dans votre organisation',
          },
        });
      }
    }

    // Préparer les données à mettre à jour
    const updateData = {};

    if (username !== undefined) {updateData.username = username;}
    if (first_name !== undefined) {updateData.first_name = first_name;}
    if (last_name !== undefined) {updateData.last_name = last_name;}
    if (email !== undefined) {updateData.email = email || null;}
    if (role !== undefined) {updateData.role = role;}
    if (is_active !== undefined) {updateData.is_active = is_active;}

    // Si un nouveau PIN est fourni, l'ajouter aux données
    // Note: Le PIN sera hashé automatiquement par le hook beforeUpdate du modèle User
    if (pin_code) {
      // ✅ P1-1: Validation du PIN (6 chiffres minimum - sécurité anti-brute-force)
      if (!/^\d{6,}$/.test(pin_code)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Le code PIN doit contenir au moins 6 chiffres',
          },
        });
      }
      updateData.pin_code = pin_code;
    }

    // Mettre à jour l'utilisateur
    await user.update(updateData);

    // Retourner sans le PIN hashé
    const userResponse = user.toJSON();
    delete userResponse.pin_code;

    res.json({
      success: true,
      data: userResponse,
      message: 'Utilisateur modifié avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la modification de l\'utilisateur:', error);
    next(error);
  }
};

/**
 * Supprimer un utilisateur (soft delete via is_active)
 * MULTI-TENANT: Vérifie que l'utilisateur appartient à l'organisation
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    // MULTI-TENANT: Vérifier que l'utilisateur appartient à la même organisation
    const user = await User.findOne({
      where: {
        id,
        organization_id: organizationId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Ne pas permettre la suppression de son propre compte
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vous ne pouvez pas supprimer votre propre compte',
        },
      });
    }

    // Désactiver l'utilisateur (soft delete)
    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    next(error);
  }
};

/**
 * RGPD Article 15 - Droit à la portabilité des données
 * Exporter toutes les données personnelles de l'utilisateur connecté
 */
const exportPersonalData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.organizationId;

    // Récupérer les informations de l'utilisateur
    const user = await User.findOne({
      where: {
        id: userId,
        organization_id: organizationId,
      },
      attributes: { exclude: ['pin_code'] }, // Ne jamais exposer le PIN hashé
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Récupérer toutes les ventes créées par cet utilisateur
    const sales = await Sale.findAll({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
      order: [['created_at', 'DESC']],
      limit: 1000, // Limiter à 1000 ventes les plus récentes
    });

    // Récupérer les logs d'audit de cet utilisateur
    const auditLogs = await AuditLog.findAll({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
      order: [['created_at', 'DESC']],
      limit: 500, // Limiter à 500 logs les plus récents
    });

    // Construire l'export complet
    const exportData = {
      export_date: new Date().toISOString(),
      rgpd_article: 'Article 15 - Droit à la portabilité des données',
      user: user.toJSON(),
      sales: {
        total_count: sales.length,
        data: sales.map((sale) => sale.toJSON()),
      },
      audit_logs: {
        total_count: auditLogs.length,
        data: auditLogs.map((log) => log.toJSON()),
      },
      metadata: {
        organization_id: organizationId,
        export_requested_by: userId,
        note: 'Cet export contient toutes vos données personnelles stockées dans notre système. Vous avez le droit de les consulter, les corriger ou les supprimer.',
      },
    };

    logger.info(`Export RGPD effectué pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Erreur lors de l\'export des données personnelles:', error);
    next(error);
  }
};

/**
 * RGPD Article 17 - Droit à l'effacement
 * Demander la suppression définitive du compte (exécutée après 30 jours)
 */
const requestAccountDeletion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.organizationId;

    // Récupérer l'utilisateur
    const user = await User.findOne({
      where: {
        id: userId,
        organization_id: organizationId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier si une demande de suppression n'a pas déjà été faite
    if (user.deletion_requested_at) {
      const deletionDate = new Date(user.deletion_requested_at);
      deletionDate.setDate(deletionDate.getDate() + 30);

      return res.status(400).json({
        success: false,
        error: {
          code: 'DELETION_ALREADY_REQUESTED',
          message: 'Une demande de suppression a déjà été effectuée',
          deletion_date: deletionDate.toISOString(),
        },
      });
    }

    // Marquer le compte pour suppression
    await user.update({
      deletion_requested_at: new Date(),
      is_active: false, // Désactiver immédiatement le compte
    });

    // Calculer la date de suppression définitive (dans 30 jours)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    logger.info(`Demande de suppression RGPD pour l'utilisateur ${userId} (suppression prévue le ${deletionDate.toISOString()})`);

    res.json({
      success: true,
      message: 'Demande de suppression enregistrée avec succès',
      data: {
        deletion_requested_at: user.deletion_requested_at,
        deletion_scheduled_for: deletionDate.toISOString(),
        notice: 'Votre compte sera définitivement supprimé dans 30 jours. Si vous changez d\'avis, contactez votre administrateur avant cette date.',
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la demande de suppression de compte:', error);
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  exportPersonalData,
  requestAccountDeletion,
};
