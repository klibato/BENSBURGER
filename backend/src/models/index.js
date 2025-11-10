const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const MenuComposition = require('./MenuComposition');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const CashRegister = require('./CashRegister');
const AuditLog = require('./AuditLog');

// ============================================
// RELATIONS
// ============================================

// User <-> Sales (Un utilisateur a plusieurs ventes)
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> CashRegisters (Un utilisateur a plusieurs caisses)
User.hasMany(CashRegister, { foreignKey: 'user_id', as: 'cash_registers' });
CashRegister.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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
  User,
  Product,
  MenuComposition,
  Sale,
  SaleItem,
  CashRegister,
  AuditLog,
};
