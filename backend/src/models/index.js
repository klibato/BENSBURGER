const { sequelize } = require('../config/database');
const Organization = require('./Organization');
const User = require('./User');
const Product = require('./Product');
const MenuComposition = require('./MenuComposition');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const CashRegister = require('./CashRegister');
const AuditLog = require('./AuditLog');
const StoreSettings = require('./StoreSettings');

// ============================================
// RELATIONS
// ============================================

// Organization <-> Users (Une organisation a plusieurs utilisateurs)
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> Products (Une organisation a plusieurs produits)
Organization.hasMany(Product, { foreignKey: 'organization_id', as: 'products' });
Product.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> MenuCompositions
Organization.hasMany(MenuComposition, { foreignKey: 'organization_id', as: 'menu_compositions' });
MenuComposition.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> CashRegisters
Organization.hasMany(CashRegister, { foreignKey: 'organization_id', as: 'cash_registers' });
CashRegister.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> Sales
Organization.hasMany(Sale, { foreignKey: 'organization_id', as: 'sales' });
Sale.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> SaleItems
Organization.hasMany(SaleItem, { foreignKey: 'organization_id', as: 'sale_items' });
SaleItem.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> AuditLogs
Organization.hasMany(AuditLog, { foreignKey: 'organization_id', as: 'audit_logs' });
AuditLog.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// User <-> Sales (Un utilisateur a plusieurs ventes)
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> CashRegisters (Un utilisateur a plusieurs caisses)
User.hasMany(CashRegister, { foreignKey: 'opened_by', as: 'opened_cash_registers' });
CashRegister.belongsTo(User, { foreignKey: 'opened_by', as: 'openedByUser' });

User.hasMany(CashRegister, { foreignKey: 'closed_by', as: 'closed_cash_registers' });
CashRegister.belongsTo(User, { foreignKey: 'closed_by', as: 'closedByUser' });

// User <-> AuditLogs (Un utilisateur a plusieurs logs)
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Product <-> MenuCompositions (Un produit peut être dans plusieurs menus)
Product.hasMany(MenuComposition, { foreignKey: 'menu_id', as: 'menu_items' });
Product.hasMany(MenuComposition, { foreignKey: 'product_id', as: 'in_menus' });
MenuComposition.belongsTo(Product, { foreignKey: 'menu_id', as: 'menu' });
MenuComposition.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Sale <-> SaleItems (Une vente a plusieurs items)
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Product <-> SaleItems (Un produit peut être dans plusieurs ventes)
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'sale_items' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// CashRegister <-> Sales (Une caisse a plusieurs ventes)
CashRegister.hasMany(Sale, { foreignKey: 'cash_register_id', as: 'sales' });
Sale.belongsTo(CashRegister, { foreignKey: 'cash_register_id', as: 'cash_register' });

// User (cancelled_by) <-> Sales
User.hasMany(Sale, { foreignKey: 'cancelled_by', as: 'cancelled_sales' });
Sale.belongsTo(User, { foreignKey: 'cancelled_by', as: 'canceller' });

// ============================================
// EXPORTS
// ============================================

module.exports = {
  sequelize,
  Organization,
  User,
  Product,
  MenuComposition,
  Sale,
  SaleItem,
  CashRegister,
  AuditLog,
  StoreSettings,
};
