const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

/**
 * @route   POST /api/organizations/register
 * @desc    Créer une nouvelle organisation (inscription)
 * @access  Public
 */
router.post('/register', organizationController.registerOrganization);

/**
 * @route   GET /api/organizations
 * @desc    Récupérer toutes les organisations
 * @access  Super Admin (future)
 */
router.get(
  '/',
  authenticateToken,
  // TODO: Add requireSuperAdmin middleware when implementing super admin role
  organizationController.getAllOrganizations
);

/**
 * @route   GET /api/organizations/:id
 * @desc    Récupérer une organisation par ID
 * @access  Admin de l'organisation
 */
router.get('/:id', authenticateToken, organizationController.getOrganizationById);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Mettre à jour une organisation
 * @access  Admin de l'organisation
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  organizationController.updateOrganization
);

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Supprimer une organisation (soft delete)
 * @access  Super Admin (future)
 */
router.delete(
  '/:id',
  authenticateToken,
  // TODO: Add requireSuperAdmin middleware
  organizationController.deleteOrganization
);

module.exports = router;
