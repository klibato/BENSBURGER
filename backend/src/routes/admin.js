const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const adminAuthController = require('../controllers/admin/adminAuthController');
const adminOrganizationsController = require('../controllers/admin/adminOrganizationsController');
const adminAnalyticsController = require('../controllers/admin/adminAnalyticsController');

const { authenticateAdmin, requireSuperAdmin, requireAdminPermission } = require('../middlewares/adminAuth');
const tenantIsolation = require('../middlewares/tenantIsolation');

// ✅ P1-3: Rate limiting password reset (anti-brute-force)
// Limiter à 3 tentatives par heure par IP (protection contre énumération)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 tentatives max
  skipSuccessfulRequests: false, // Compter même les réussites
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de demandes de réinitialisation. Veuillez réessayer dans 1 heure.',
    },
  },
  standardHeaders: true, // Retourner info dans headers `RateLimit-*`
  legacyHeaders: false, // Désactiver headers `X-RateLimit-*`
});

// ✅ FIX CVE-FLEXPOS-007: Forcer isolation multi-tenant
router.use(tenantIsolation);

// ============================================
// AUTH ROUTES (Public)
// ============================================
router.post('/auth/login', adminAuthController.login);
router.post('/auth/logout', adminAuthController.logout);

// ✅ P1-3: Appliquer rate limiting sur password reset (3/heure)
router.post('/auth/password-reset/request', passwordResetLimiter, adminAuthController.requestPasswordReset);
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
router.get('/organizations/:id/sales', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getOrganizationSales);
router.get('/organizations/:id/users', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getOrganizationUsers);
router.get('/organizations/:id/invoices', authenticateAdmin, requireAdminPermission('organizations:read'), adminOrganizationsController.getOrganizationInvoices);
router.put('/organizations/:id/subscription', authenticateAdmin, requireSuperAdmin, adminOrganizationsController.updateOrganizationSubscription);

// Users
router.put('/users/:id/password', authenticateAdmin, requireSuperAdmin, adminOrganizationsController.changeUserPassword);

// Invoices
router.get('/invoices', authenticateAdmin, requireAdminPermission('invoices:read'), adminOrganizationsController.getAllInvoices);

// Analytics
router.get('/analytics/dashboard', authenticateAdmin, requireAdminPermission('analytics:read'), adminAnalyticsController.getDashboard);

module.exports = router;
