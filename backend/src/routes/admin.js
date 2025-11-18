const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/admin/adminAuthController');
const adminOrganizationsController = require('../controllers/admin/adminOrganizationsController');
const adminAnalyticsController = require('../controllers/admin/adminAnalyticsController');

const { authenticateAdmin, requireSuperAdmin, requireAdminPermission } = require('../middlewares/adminAuth');

// ============================================
// AUTH ROUTES (Public)
// ============================================
router.post('/auth/login', adminAuthController.login);
router.post('/auth/logout', adminAuthController.logout);
router.post('/auth/password-reset/request', adminAuthController.requestPasswordReset);
router.post('/auth/password-reset', adminAuthController.resetPassword);

// ============================================
// PROTECTED ROUTES (Require Admin Auth)
// ============================================

// Current admin
router.get('/auth/me', authenticateAdmin, adminAuthController.getMe);

// Organizations
router.get('/organizations', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getAllOrganizations);
router.get('/organizations/:id', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getOrganizationById);
router.put('/organizations/:id/suspend', authenticateAdmin, requireSuperAdmin, adminOrganizationsController.suspendOrganization);
router.put('/organizations/:id/activate', authenticateAdmin, requireSuperAdmin, adminOrganizationsController.activateOrganization);

// Analytics
router.get('/analytics/dashboard', authenticateAdmin, requireAdminPermission('analytics:read'), adminAnalyticsController.getDashboard);

module.exports = router;
