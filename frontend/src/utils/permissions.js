/**
 * Définition des permissions - doit correspondre au backend
 */

export const PERMISSIONS = {
  // Permissions produits
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',

  // Permissions utilisateurs
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Permissions ventes
  SALES_CREATE: 'sales:create',
  SALES_VIEW: 'sales:view',
  SALES_VIEW_ALL: 'sales:view_all',

  // Permissions caisse
  CASH_REGISTER_OPEN: 'cash_register:open',
  CASH_REGISTER_CLOSE: 'cash_register:close',
  CASH_REGISTER_VIEW: 'cash_register:view',
  CASH_REGISTER_VIEW_ALL: 'cash_register:view_all',

  // Permissions dashboard et rapports
  DASHBOARD_VIEW: 'dashboard:view',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Permissions système
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  AUDIT_LOGS_VIEW: 'audit_logs:view',
};
