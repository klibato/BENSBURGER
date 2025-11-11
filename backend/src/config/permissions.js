/**
 * Définition des permissions par rôle pour le système POS BensBurger
 */

const PERMISSIONS = {
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
  SALES_VIEW_ALL: 'sales:view_all', // Voir toutes les ventes (pas juste les siennes)

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

/**
 * Permissions par rôle
 */
const ROLE_PERMISSIONS = {
  admin: [
    // Toutes les permissions
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_VIEW_ALL,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.CASH_REGISTER_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW_ALL,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.AUDIT_LOGS_VIEW,
  ],
  cashier: [
    // Permissions de base pour un caissier
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_VIEW, // Seulement ses propres ventes
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.CASH_REGISTER_VIEW, // Seulement sa propre caisse
  ],
};

/**
 * Vérifier si un rôle a une permission
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string} permission - La permission à vérifier
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
};

/**
 * Vérifier si un rôle a plusieurs permissions (toutes)
 * @param {string} role - Le rôle de l'utilisateur
 * @param {Array<string>} permissions - Les permissions à vérifier
 * @returns {boolean}
 */
const hasAllPermissions = (role, permissions) => {
  return permissions.every((permission) => hasPermission(role, permission));
};

/**
 * Vérifier si un rôle a au moins une des permissions
 * @param {string} role - Le rôle de l'utilisateur
 * @param {Array<string>} permissions - Les permissions à vérifier
 * @returns {boolean}
 */
const hasAnyPermission = (role, permissions) => {
  return permissions.some((permission) => hasPermission(role, permission));
};

/**
 * Obtenir toutes les permissions d'un rôle
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {Array<string>}
 */
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
};
