const { User } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Récupérer tous les utilisateurs
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { include_inactive = 'false' } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    // Par défaut, ne montrer que les utilisateurs actifs
    // Seulement un admin peut voir les utilisateurs inactifs
    if (include_inactive !== 'true') {
      where.is_active = true;
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['pin_code'] }, // Ne pas exposer les PIN hashés
      order: [
        ['role', 'ASC'],
        ['last_name', 'ASC'],
        ['first_name', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: users,
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

    // Validation du PIN (4 chiffres)
    if (!/^\d{4}$/.test(pin_code)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le code PIN doit contenir exactement 4 chiffres',
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

    if (username !== undefined) updateData.username = username;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email || null;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Si un nouveau PIN est fourni, l'ajouter aux données
    // Note: Le PIN sera hashé automatiquement par le hook beforeUpdate du modèle User
    if (pin_code) {
      if (!/^\d{4}$/.test(pin_code)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Le code PIN doit contenir exactement 4 chiffres',
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
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

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

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
