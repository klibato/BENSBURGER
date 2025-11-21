# 📦 DOCUMENTATION MODELS BACKEND (Sequelize ORM)

**Version** : 1.0
**Date** : 2025-11-15
**Auditeur** : Claude Code
**Nombre de models** : 9 fichiers

---

## 📊 VUE D'ENSEMBLE

### Structure Fichiers Models

```
/backend/src/models/
├── index.js              # Point d'entrée + Relations Sequelize
├── User.js               # Utilisateurs (admin/cashier)
├── Product.js            # Catalogue produits + gestion stock
├── Sale.js               # Transactions/Ventes
├── SaleItem.js           # Lignes de vente
├── CashRegister.js       # Sessions caisse
├── MenuComposition.js    # Composition menus
├── AuditLog.js           # Traçabilité
└── StoreSettings.js      # Paramètres magasin (singleton)
```

### Mapping Models ↔ Tables PostgreSQL

| Model | Table BDD | PK Type | Timestamps | Soft Delete | Relations |
|-------|-----------|---------|------------|-------------|-----------|
| User | users | SERIAL | ✅ | ❌ | 4 relations |
| Product | products | SERIAL | ✅ | ✅ (paranoid) | 3 relations |
| Sale | sales | SERIAL | ✅ | ❌ | 4 relations |
| SaleItem | sale_items | SERIAL | ⚠️ (createdAt only) | ❌ | 2 relations |
| CashRegister | cash_registers | SERIAL | ❌ | ❌ | 3 relations |
| MenuComposition | menu_compositions | SERIAL | ⚠️ (createdAt only) | ❌ | 2 relations |
| AuditLog | audit_logs | SERIAL | ⚠️ (createdAt only) | ❌ | 1 relation |
| StoreSettings | store_settings | SERIAL (fixed: 1) | ✅ | ❌ | 0 relation |

**Total relations Sequelize** : 19 relations définies dans `/backend/src/models/index.js`

---

## 🔗 RELATIONS SEQUELIZE (Définies dans index.js)

### Fichier : `/backend/src/models/index.js` (67 lignes)

**Rôle** : Point d'entrée centralisé pour tous les models + définition des relations

```javascript
// Imports
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
// ... (8 models importés)

// ============================================
// RELATIONS
// ============================================

// USER <-> SALES
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// USER <-> CASH_REGISTERS (ouverture)
User.hasMany(CashRegister, { foreignKey: 'opened_by', as: 'opened_cash_registers' });
CashRegister.belongsTo(User, { foreignKey: 'opened_by', as: 'openedByUser' });

// USER <-> CASH_REGISTERS (clôture)
User.hasMany(CashRegister, { foreignKey: 'closed_by', as: 'closed_cash_registers' });
CashRegister.belongsTo(User, { foreignKey: 'closed_by', as: 'closedByUser' });

// USER <-> AUDIT_LOGS
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PRODUCT <-> MENU_COMPOSITIONS (double relation)
Product.hasMany(MenuComposition, { foreignKey: 'menu_id', as: 'menu_items' });
Product.hasMany(MenuComposition, { foreignKey: 'product_id', as: 'in_menus' });
MenuComposition.belongsTo(Product, { foreignKey: 'menu_id', as: 'menu' });
MenuComposition.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// SALE <-> SALE_ITEMS
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// PRODUCT <-> SALE_ITEMS
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'sale_items' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// CASH_REGISTER <-> SALES
CashRegister.hasMany(Sale, { foreignKey: 'cash_register_id', as: 'sales' });
Sale.belongsTo(CashRegister, { foreignKey: 'cash_register_id', as: 'cash_register' });

// USER <-> SALES (annulation)
User.hasMany(Sale, { foreignKey: 'cancelled_by', as: 'cancelled_sales' });
Sale.belongsTo(User, { foreignKey: 'cancelled_by', as: 'canceller' });

// Exports
module.exports = {
  sequelize,
  User,
  Product,
  MenuComposition,
  Sale,
  SaleItem,
  CashRegister,
  AuditLog,
  StoreSettings,
};
```

### Diagramme Relations

```
┌──────────────┐
│     User     │◄─────────────────┐
│   (users)    │                  │
└──────┬───────┘                  │
       │                          │
       │ 1:N sales                │
       ↓                          │
┌──────────────┐                  │
│     Sale     │                  │
│   (sales)    │──────────────────┘ N:1 cancelled_by
└──────┬───────┘
       │
       │ 1:N items
       ↓
┌──────────────┐
│   SaleItem   │
│ (sale_items) │
└──────┬───────┘
       │
       │ N:1 product
       ↓
┌──────────────────┐
│     Product      │
│   (products)     │◄────────┐
└──────┬───────────┘         │
       │                     │
       │ 1:N menu_items      │ 1:N in_menus
       ↓                     │
┌──────────────────┐         │
│ MenuComposition  │─────────┘
│(menu_compositions)
└──────────────────┘

┌──────────────┐
│     User     │
│   (users)    │
└──────┬───────┘
       │
       │ 1:N opened_cash_registers
       │ 1:N closed_cash_registers
       ↓
┌──────────────────┐
│  CashRegister    │
│(cash_registers)  │
└──────┬───────────┘
       │
       │ 1:N sales
       ↓
┌──────────────┐
│     Sale     │
│   (sales)    │
└──────────────┘

┌──────────────┐
│     User     │
│   (users)    │
└──────┬───────┘
       │
       │ 1:N audit_logs
       ↓
┌──────────────┐
│   AuditLog   │
│(audit_logs)  │
└──────────────┘

┌──────────────────┐
│  StoreSettings   │
│ (store_settings) │ (Singleton - Aucune relation)
└──────────────────┘
```

---

## 📋 MODEL 1 : User.js

**Fichier** : `/backend/src/models/User.js` (100 lignes)
**Table BDD** : `users`
**Rôle** : Gestion utilisateurs (administrateurs + caissiers)

### Colonnes Sequelize

| Colonne | Type Sequelize | AllowNull | Unique | Default | Validation |
|---------|----------------|-----------|--------|---------|------------|
| id | INTEGER | ❌ | PK Auto | Auto | - |
| username | STRING(100) | ❌ | ✅ | - | notEmpty, len: [3,100] |
| pin_code | STRING(255) | ❌ | ❌ | - | notEmpty |
| role | STRING(20) | ❌ | ❌ | - | isIn: ['admin', 'cashier'] |
| first_name | STRING(100) | ✅ | ❌ | null | - |
| last_name | STRING(100) | ✅ | ❌ | null | - |
| email | STRING(255) | ✅ | ❌ | null | isEmail |
| is_active | BOOLEAN | ✅ | ❌ | true | - |
| created_at | DATE | ✅ | ❌ | NOW() | - |
| updated_at | DATE | ✅ | ❌ | NOW() | - |

### Hooks Sequelize

```javascript
{
  hooks: {
    beforeCreate: async (user) => {
      if (user.pin_code) {
        user.pin_code = await bcrypt.hash(user.pin_code, 10); // 10 rounds
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('pin_code')) {
        user.pin_code = await bcrypt.hash(user.pin_code, 10);
      }
    },
  }
}
```

**Sécurité** :
- ✅ PIN automatiquement hashé avec bcryptjs (10 rounds)
- ✅ Hash uniquement si PIN modifié (évite double hash)
- ✅ PIN jamais exposé en clair

### Méthodes d'Instance

#### 1. `validatePinCode(pin)` (ligne 81)

**Signature** :
```javascript
User.prototype.validatePinCode = async function (pin) {
  return bcrypt.compare(pin, this.pin_code);
}
```

**Usage** :
```javascript
const user = await User.findOne({ where: { username: 'admin' } });
const isValid = await user.validatePinCode('1234'); // true ou false
```

**Retour** : `Promise<boolean>` - true si PIN valide

#### 2. `toPublicJSON()` (ligne 86)

**Signature** :
```javascript
User.prototype.toPublicJSON = function () {
  const { id, username, role, first_name, last_name, email, is_active } = this;
  return { id, username, role, first_name, last_name, email, is_active };
}
```

**Rôle** : Retourner objet user SANS le pin_code (sécurité)

**Usage** :
```javascript
res.json({ user: user.toPublicJSON() });
```

### Relations

- ✅ **hasMany(Sale)** via `user_id` → alias 'sales'
- ✅ **hasMany(CashRegister)** via `opened_by` → alias 'opened_cash_registers'
- ✅ **hasMany(CashRegister)** via `closed_by` → alias 'closed_cash_registers'
- ✅ **hasMany(AuditLog)** via `user_id` → alias 'audit_logs'
- ✅ **hasMany(Sale)** via `cancelled_by` → alias 'cancelled_sales'

### Code Review

**✅ Bonnes pratiques** :
- Hash bcrypt automatique avec hooks
- Validation Sequelize sur username (len: [3,100])
- Méthode toPublicJSON() pour éviter fuite PIN
- Validation email avec `isEmail`

**⚠️ Points d'attention** :
- Pas de soft delete (is_active utilisé à la place)
- Pas de champ `organization_id` (mono-tenant)
- Pas de validation force sur format PIN (ex: 4 chiffres minimum)

**❌ Problèmes** :
- Aucun problème critique détecté

---

## 📋 MODEL 2 : Product.js

**Fichier** : `/backend/src/models/Product.js` (167 lignes)
**Table BDD** : `products`
**Rôle** : Catalogue produits + gestion stock + menus composés

### Colonnes Sequelize

| Colonne | Type | AllowNull | Default | Validation | Description |
|---------|------|-----------|---------|------------|-------------|
| id | INTEGER | ❌ | Auto | - | PK |
| name | STRING(255) | ❌ | - | notEmpty | Nom produit |
| description | TEXT | ✅ | null | - | Description |
| price_ht | DECIMAL(10,2) | ❌ | - | min: 0 | Prix HT |
| vat_rate | DECIMAL(4,2) | ❌ | - | min: 0, max: 100 | Taux TVA |
| category | STRING(50) | ❌ | - | notEmpty | Catégorie |
| image_url | STRING(500) | ✅ | null | - | URL image |
| is_active | BOOLEAN | ✅ | true | - | Produit actif |
| is_menu | BOOLEAN | ✅ | false | - | Est un menu composé |
| display_order | INTEGER | ✅ | 0 | - | Ordre affichage |
| **quantity** | INTEGER | ❌ | 0 | min: 0 | **Stock disponible** |
| **low_stock_threshold** | INTEGER | ❌ | 10 | min: 0 | **Seuil alerte** |
| created_at | DATE | ✅ | NOW() | - | Date création |
| updated_at | DATE | ✅ | NOW() | - | Date MAJ |
| deleted_at | DATE | ✅ | null | - | Soft delete (paranoid) |

**⚠️ Attention** : Colonnes `quantity` et `low_stock_threshold` ajoutées par migration ultérieure (006_add_stock_to_products.sql)

### Options Sequelize

```javascript
{
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,        // ✅ Soft delete activé
  deletedAt: 'deleted_at',
}
```

**Soft Delete** : ✅ Actif via `paranoid: true` → produit supprimé a `deleted_at != NULL`

### Méthodes d'Instance

#### 1. `getPriceTTC()` (ligne 99)

**Signature** :
```javascript
Product.prototype.getPriceTTC = function () {
  return (parseFloat(this.price_ht) * (1 + parseFloat(this.vat_rate) / 100)).toFixed(2);
}
```

**Calcul** : `price_ttc = price_ht * (1 + vat_rate / 100)`

**Retour** : `string` (2 décimales)

**Exemple** :
```javascript
const product = { price_ht: 10.00, vat_rate: 10.0 };
product.getPriceTTC(); // "11.00"
```

#### 2. `hasStock(requestedQuantity = 1)` (ligne 104)

**Rôle** : Vérifier si stock suffisant

**Logique** :
```javascript
Product.prototype.hasStock = function (requestedQuantity = 1) {
  if (this.is_menu) {
    return true; // Menus n'ont pas de stock direct
  }
  return this.quantity >= requestedQuantity;
}
```

**Retour** : `boolean`

#### 3. `isLowStock()` (ligne 113)

**Rôle** : Vérifier si stock bas (alerte)

**Logique** :
```javascript
Product.prototype.isLowStock = function () {
  if (this.is_menu) {
    return false; // Menus exempts
  }
  return this.quantity <= this.low_stock_threshold && this.quantity > 0;
}
```

**Exemple** : Si `quantity = 8` et `low_stock_threshold = 10` → `true`

#### 4. `isOutOfStock()` (ligne 122)

**Rôle** : Vérifier si rupture stock

**Logique** :
```javascript
Product.prototype.isOutOfStock = function () {
  if (this.is_menu) {
    return false;
  }
  return this.quantity === 0;
}
```

#### 5. `decrementStock(quantity = 1)` (ligne 131) - **ASYNC**

**Rôle** : Décrémenter stock après vente

**Logique** :
```javascript
Product.prototype.decrementStock = async function (quantity = 1) {
  if (this.is_menu) {
    return true; // Skip pour menus
  }

  if (!this.hasStock(quantity)) {
    throw new Error(`Stock insuffisant pour ${this.name}. Disponible: ${this.quantity}, Demandé: ${quantity}`);
  }

  this.quantity -= quantity;
  await this.save(); // ⚠️ UPDATE en BDD
  return true;
}
```

**Erreur** : Lance exception si stock insuffisant

**⚠️ Important** : Appeler dans transaction SQL pour atomicité !

#### 6. `incrementStock(quantity = 1)` (ligne 147) - **ASYNC**

**Rôle** : Réapprovisionner stock

**Logique** :
```javascript
Product.prototype.incrementStock = async function (quantity = 1) {
  if (this.is_menu) {
    return true;
  }

  this.quantity += quantity;
  await this.save();
  return true;
}
```

#### 7. `toJSON()` (ligne 158) - **OVERRIDE**

**Rôle** : Enrichir JSON auto avec données calculées

**Logique** :
```javascript
Product.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.price_ttc = this.getPriceTTC();        // ✅ Ajout calculé
  values.is_low_stock = this.isLowStock();      // ✅ Ajout calculé
  values.is_out_of_stock = this.isOutOfStock(); // ✅ Ajout calculé
  return values;
}
```

**Résultat** : Objet JSON inclut automatiquement `price_ttc`, `is_low_stock`, `is_out_of_stock`

**Usage** :
```javascript
res.json(product); // toJSON() appelé automatiquement
```

### Relations

- ✅ **hasMany(MenuComposition)** via `menu_id` → alias 'menu_items' (si is_menu = true)
- ✅ **hasMany(MenuComposition)** via `product_id` → alias 'in_menus' (produits dans menus)
- ✅ **hasMany(SaleItem)** via `product_id` → alias 'sale_items'

### Code Review

**✅ Bonnes pratiques** :
- Soft delete avec `paranoid: true`
- Méthodes métier complètes (stock, prix, etc.)
- Override toJSON() pour enrichir données
- Validation `min: 0` sur prix et stock
- Gestion intelligente stock pour menus (skip)

**⚠️ Points d'attention** :
- `decrementStock()` fait UPDATE BDD → doit être dans transaction
- `vat_rate` accepte 0-100 mais init.sql limite à (5.5, 10.0, 20.0) → validation inconsistante
- Pas de champ `organization_id` (mono-tenant)
- `category` est STRING libre (pas de validation isIn)

**❌ Problèmes** :
- Risque race condition si 2 ventes simultanées décrémentent stock (besoin transaction + lock)

---

## 📋 MODEL 3 : Sale.js

**Fichier** : `/backend/src/models/Sale.js` (129 lignes)
**Table BDD** : `sales`
**Rôle** : Transactions de vente

### Colonnes Sequelize

| Colonne | Type | AllowNull | Unique | Default | Validation |
|---------|------|-----------|--------|---------|------------|
| id | INTEGER | ❌ | PK | Auto | - |
| ticket_number | STRING(50) | ❌ | ✅ | '' | - |
| user_id | INTEGER FK | ❌ | ❌ | - | - |
| total_ht | DECIMAL(10,2) | ❌ | ❌ | - | - |
| total_ttc | DECIMAL(10,2) | ❌ | ❌ | - | - |
| vat_details | JSONB | ❌ | ❌ | {} | - |
| payment_method | STRING(20) | ❌ | ❌ | - | isIn: ['cash', 'card', 'meal_voucher', 'mixed', 'sumup'] |
| payment_details | JSONB | ✅ | ❌ | null | - |
| amount_paid | DECIMAL(10,2) | ❌ | ❌ | - | - |
| change_given | DECIMAL(10,2) | ✅ | ❌ | 0 | - |
| status | STRING(20) | ✅ | ❌ | 'completed' | isIn: ['completed', 'cancelled', 'refunded'] |
| cash_register_id | INTEGER FK | ✅ | ❌ | null | - |
| **discount_type** | STRING(20) | ✅ | ❌ | null | isIn: ['percentage', 'amount'] |
| **discount_value** | DECIMAL(10,2) | ✅ | ❌ | null | - |
| **discount_amount** | DECIMAL(10,2) | ✅ | ❌ | 0 | - |
| notes | TEXT | ✅ | ❌ | null | - |
| created_at | DATE | ✅ | ❌ | NOW() | - |
| updated_at | DATE | ✅ | ❌ | NOW() | - |
| cancelled_at | DATE | ✅ | ❌ | null | - |
| cancelled_by | INTEGER FK | ✅ | ❌ | null | - |

**⚠️ Nouveautés détectées** : Colonnes `discount_type`, `discount_value`, `discount_amount` (pas dans init.sql)

### Hooks Sequelize

```javascript
{
  hooks: {
    beforeValidate: async (sale) => {
      // Générer ticket_number si non fourni
      if (!sale.ticket_number || sale.ticket_number === '') {
        const [result] = await sequelize.query(
          `SELECT TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0') AS ticket_number`
        );
        sale.ticket_number = result[0].ticket_number;
      }
    },
  }
}
```

**Fonctionnement** :
- Génère automatiquement `ticket_number` au format `YYYYMMDD-0001`
- Utilise séquence PostgreSQL `ticket_number_seq`
- Format : `TO_CHAR(CURRENT_DATE, 'YYYYMMDD')` + '-' + numéro séquentiel sur 4 chiffres

**Exemple** : `20251115-0023`

**⚠️ Attention** : Séquence réinitialisée chaque jour (préfixe date)

### Relations

- ✅ **belongsTo(User)** via `user_id` → alias 'user' (caissier)
- ✅ **belongsTo(CashRegister)** via `cash_register_id` → alias 'cash_register'
- ✅ **belongsTo(User)** via `cancelled_by` → alias 'canceller' (qui a annulé)
- ✅ **hasMany(SaleItem)** via `sale_id` → alias 'items'

### Méthodes d'Instance

**Aucune méthode personnalisée** (contrairement à Product et User)

**Suggestion amélioration** :
- Ajouter `sale.cancel(userId)` pour annulation
- Ajouter `sale.calculateTotals()` pour recalcul
- Ajouter `sale.toReceipt()` pour formater ticket

### Code Review

**✅ Bonnes pratiques** :
- Génération auto ticket_number via hook
- Support paiements mixtes (JSONB `payment_details`)
- Support remises (discount_type/value/amount)
- Traçabilité annulation (cancelled_at + cancelled_by)
- Timestamps complets

**⚠️ Points d'attention** :
- `ticket_number` généré côté application (pas trigger BDD comme init.sql)
- Inconsistance : init.sql a trigger SQL, model a hook JS → **DUPLICATION !**
- `vat_details` JSONB sans schéma de validation
- Pas de champ `organization_id` (mono-tenant)
- Pas de hash NF525

**❌ Problèmes critiques** :
- **DUPLICATION génération ticket_number** : Init.sql a trigger SQL + Model a hook JS → Risque conflit !
- **Solution recommandée** : Garder trigger SQL, supprimer hook JS

---

## 📋 MODEL 4 : SaleItem.js

**Fichier** : `/backend/src/models/SaleItem.js` (73 lignes)
**Table BDD** : `sale_items`
**Rôle** : Lignes individuelles d'une vente

### Colonnes Sequelize

| Colonne | Type | AllowNull | Default | Validation |
|---------|------|-----------|---------|------------|
| id | INTEGER | ❌ | Auto | - |
| sale_id | INTEGER FK | ❌ | - | - |
| product_id | INTEGER FK | ✅ | null | - |
| product_name | STRING(255) | ❌ | - | - |
| quantity | INTEGER | ❌ | - | min: 1 |
| unit_price_ht | DECIMAL(10,2) | ❌ | - | - |
| vat_rate | DECIMAL(4,2) | ❌ | - | - |
| total_ht | DECIMAL(10,2) | ❌ | - | - |
| total_ttc | DECIMAL(10,2) | ❌ | - | - |
| discount_percent | DECIMAL(5,2) | ✅ | 0 | - |
| discount_amount | DECIMAL(10,2) | ✅ | 0 | - |
| created_at | DATE | ✅ | NOW() | - |

**⚠️ Particularités** :
- `timestamps: false` mais `createdAt: 'created_at'` défini → Uniquement created_at, pas updated_at
- `product_id` **NULLABLE** → Permet historique si produit supprimé (soft delete Product)

### Options Sequelize

```javascript
{
  tableName: 'sale_items',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
}
```

### Relations

- ✅ **belongsTo(Sale)** via `sale_id` → alias 'sale'
- ✅ **belongsTo(Product)** via `product_id` → alias 'product'

### Méthodes d'Instance

**Aucune méthode personnalisée**

### Code Review

**✅ Bonnes pratiques** :
- `product_name` dupliqué (dénormalisation) → Historique fiable même si produit supprimé
- `product_id` nullable → Pas de contrainte forte, permet soft delete produits
- Validation `quantity >= 1`
- Support remises par ligne (discount_percent, discount_amount)

**⚠️ Points d'attention** :
- Pas de `updated_at` (immutable après création)
- Totaux (total_ht, total_ttc) calculés côté controller, pas de validation cohérence
- Pas de méthode `calculateTotals()`

**❌ Problèmes** :
- Aucun problème critique

---

## 📋 MODEL 5 : CashRegister.js

**Fichier** : `/backend/src/models/CashRegister.js` (107 lignes)
**Table BDD** : `cash_registers`
**Rôle** : Sessions de caisse (ouverture/clôture)

### Colonnes Sequelize

| Colonne | Type | AllowNull | Default | Validation |
|---------|------|-----------|---------|------------|
| id | INTEGER | ❌ | Auto | - |
| register_name | STRING(100) | ❌ | - | - |
| opened_by | INTEGER FK | ❌ | - | - |
| closed_by | INTEGER FK | ✅ | null | - |
| opening_balance | DECIMAL(10,2) | ❌ | - | - |
| closing_balance | DECIMAL(10,2) | ✅ | null | - |
| expected_balance | DECIMAL(10,2) | ✅ | null | - |
| counted_cash | DECIMAL(10,2) | ✅ | null | - |
| difference | DECIMAL(10,2) | ✅ | null | - |
| total_cash_collected | DECIMAL(10,2) | ✅ | 0 | - |
| total_sales | DECIMAL(10,2) | ✅ | 0 | - |
| total_cash | DECIMAL(10,2) | ✅ | 0 | - |
| total_card | DECIMAL(10,2) | ✅ | 0 | - |
| total_meal_voucher | DECIMAL(10,2) | ✅ | 0 | - |
| ticket_count | INTEGER | ✅ | 0 | - |
| status | STRING(20) | ✅ | 'open' | isIn: ['open', 'closed'] |
| closing_report | JSONB | ✅ | null | - |
| **closing_hash** | STRING(64) | ✅ | null | - |
| notes | TEXT | ✅ | null | - |
| opened_at | DATE | ✅ | NOW() | - |
| closed_at | DATE | ✅ | null | - |

**⚠️ Important** : `closing_hash` VARCHAR(64) → Préparation NF525 (SHA-256 = 64 hex chars)

### Options Sequelize

```javascript
{
  tableName: 'cash_registers',
  timestamps: false, // Pas de timestamps automatiques
}
```

### Relations

- ✅ **belongsTo(User)** via `opened_by` → alias 'openedByUser'
- ✅ **belongsTo(User)** via `closed_by` → alias 'closedByUser'
- ✅ **hasMany(Sale)** via `cash_register_id` → alias 'sales'

### Méthodes d'Instance

**Aucune méthode personnalisée**

**Suggestion amélioration** :
- `cashRegister.calculateDifference()` → Calcul automatique écart
- `cashRegister.close(userId, countedCash)` → Logique clôture
- `cashRegister.generateClosingHash()` → Hash NF525

### Code Review

**✅ Bonnes pratiques** :
- Séparation `opened_by` et `closed_by` (traçabilité)
- Totaux par mode de paiement (cash/card/meal_voucher)
- Champ `closing_report` JSONB pour détails
- Préparation NF525 avec `closing_hash`

**⚠️ Points d'attention** :
- Pas de timestamps Sequelize (opened_at/closed_at gérés manuellement)
- `closing_hash` présent mais pas de logique génération dans model
- Pas de champ `organization_id` (mono-tenant)
- Pas de hash chaîné (hash isolé)

**❌ Problèmes** :
- `closing_hash` généré côté controller, pas de méthode model dédiée

---

## 📋 MODEL 6 : MenuComposition.js

**Fichier** : `/backend/src/models/MenuComposition.js` (46 lignes)
**Table BDD** : `menu_compositions`
**Rôle** : Association menus ↔ produits (table pivot)

### Colonnes Sequelize

| Colonne | Type | AllowNull | Default | Validation |
|---------|------|-----------|---------|------------|
| id | INTEGER | ❌ | Auto | - |
| menu_id | INTEGER FK | ❌ | - | - |
| product_id | INTEGER FK | ❌ | - | - |
| quantity | INTEGER | ❌ | 1 | min: 1 |
| created_at | DATE | ✅ | NOW() | - |

### Options Sequelize

```javascript
{
  tableName: 'menu_compositions',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
}
```

### Relations

- ✅ **belongsTo(Product)** via `menu_id` → alias 'menu' (le menu parent)
- ✅ **belongsTo(Product)** via `product_id` → alias 'product' (produit inclus)

**⚠️ Double relation vers Product** : menu_id ET product_id pointent tous deux vers `products`

### Logique Métier

**Exemple** : Menu "Big Menu" (id: 10) contient :
- 1x Burger Classic (id: 3)
- 1x Frites (id: 15)
- 1x Coca (id: 20)

**Données BDD** :
```sql
INSERT INTO menu_compositions (menu_id, product_id, quantity) VALUES
  (10, 3, 1),
  (10, 15, 1),
  (10, 20, 1);
```

**Query Sequelize** :
```javascript
const menu = await Product.findByPk(10, {
  include: [{
    model: MenuComposition,
    as: 'menu_items',
    include: [{ model: Product, as: 'product' }]
  }]
});
```

### Méthodes d'Instance

**Aucune méthode personnalisée**

### Code Review

**✅ Bonnes pratiques** :
- Table pivot simple et efficace
- Support quantité variable (ex: 2x frites)
- Validation `quantity >= 1`

**⚠️ Points d'attention** :
- Pas de contrainte UNIQUE(menu_id, product_id) → Risque doublons
- Pas de validation : menu_id doit être `is_menu = true`
- Pas de cascade DELETE défini (géré en BDD)

**❌ Problèmes** :
- Pas de validation empêchant récursion (menu dans un menu)

---

## 📋 MODEL 7 : AuditLog.js

**Fichier** : `/backend/src/models/AuditLog.js` (90 lignes)
**Table BDD** : `audit_logs`
**Rôle** : Traçabilité complète des actions

### Colonnes Sequelize

| Colonne | Type | AllowNull | Default | Description |
|---------|------|-----------|---------|-------------|
| id | INTEGER | ❌ | Auto | PK |
| user_id | INTEGER FK | ✅ | null | Utilisateur (null si système) |
| action | STRING(50) | ❌ | - | Type action |
| entity_type | STRING(50) | ✅ | null | Type entité (sale, product, user, etc.) |
| entity_id | INTEGER | ✅ | null | ID entité |
| old_values | JSONB | ✅ | null | Valeurs avant modification |
| new_values | JSONB | ✅ | null | Valeurs après modification |
| ip_address | STRING(45) | ✅ | null | IPv4 ou IPv6 |
| user_agent | TEXT | ✅ | null | User agent HTTP |
| created_at | DATE | ✅ | NOW() | Date/heure action |

**Actions typiques** (commentaire ligne 21) :
- LOGIN, LOGOUT
- CREATE, UPDATE, DELETE
- OPEN_REGISTER, CLOSE_REGISTER
- SALE, etc.

### Options Sequelize

```javascript
{
  tableName: 'audit_logs',
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
}
```

### Relations

- ✅ **belongsTo(User)** via `user_id` → alias 'user'

### Méthode Statique Helper

```javascript
/**
 * Méthode helper pour créer un log facilement
 * @param {Object} data - Données du log
 * @param {number} data.userId - ID de l'utilisateur
 * @param {string} data.action - Action effectuée
 * @param {string} data.entityType - Type d'entité
 * @param {number} data.entityId - ID de l'entité
 * @param {Object} data.details - Détails (old_values, new_values, etc.)
 * @param {string} data.ipAddress - Adresse IP
 * @param {string} data.userAgent - User agent
 */
AuditLog.log = async function (data) {
  try {
    return await AuditLog.create({
      user_id: data.userId || null,
      action: data.action,
      entity_type: data.entityType || null,
      entity_id: data.entityId || null,
      old_values: data.details?.oldValues || null,
      new_values: data.details?.newValues || data.details || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
    });
  } catch (error) {
    console.error('Erreur lors de la création du log d\'audit:', error);
    // Ne pas bloquer l'application si le logging échoue
    return null;
  }
};
```

**Usage** :
```javascript
await AuditLog.log({
  userId: req.user.id,
  action: 'UPDATE',
  entityType: 'product',
  entityId: product.id,
  details: {
    oldValues: { price_ht: 10.00 },
    newValues: { price_ht: 12.00 }
  },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

**⚠️ Important** : Catch error silencieux → Logging ne doit jamais bloquer l'app

### Code Review

**✅ Bonnes pratiques** :
- Méthode statique `AuditLog.log()` facile d'usage
- Stockage old_values + new_values (JSONB)
- Support IP + User Agent (traçabilité complète)
- Error handling gracieux (return null si échec)
- user_id nullable (actions système)

**⚠️ Points d'attention** :
- Pas de champ `organization_id` (mono-tenant)
- Pas de rotation logs (table va grossir indéfiniment)
- Pas de stratégie archivage
- `action` STRING libre (pas de validation isIn)

**❌ Problèmes** :
- Risque volumétrie élevée sans stratégie purge/archivage

---

## 📋 MODEL 8 : StoreSettings.js

**Fichier** : `/backend/src/models/StoreSettings.js` (192 lignes)
**Table BDD** : `store_settings`
**Rôle** : Paramètres magasin (singleton - 1 seule ligne)

### Colonnes Sequelize (38 colonnes !)

**⚠️ Model le plus complexe - Paramètres métier + configurations techniques**

#### Informations Magasin

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| id | INTEGER | 1 | PK fixe (singleton) |
| store_name | STRING(255) | 'FlexPOS' | Nom commercial |
| store_description | STRING(255) | 'Restaurant Rapide' | Description |
| address_line1 | STRING(255) | '123 Avenue des Burgers' | Adresse 1 |
| address_line2 | STRING(255) | null | Adresse 2 |
| postal_code | STRING(10) | '75001' | Code postal |
| city | STRING(100) | 'Paris' | Ville |
| country | STRING(100) | 'France' | Pays |
| phone | STRING(20) | '01 23 45 67 89' | Téléphone |
| email | STRING(255) | null | Email (validé isEmail) |
| website | STRING(255) | null | Site web (validé isUrl) |

#### Informations Légales (France)

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| legal_form | STRING(50) | 'SARL' | Forme juridique |
| capital_amount | DECIMAL(10,2) | 10000.00 | Capital social |
| siret | STRING(14) | '12345678900012' | SIRET (14 chiffres) |
| vat_number | STRING(20) | 'FR12345678901' | N° TVA intracommunautaire |
| rcs | STRING(100) | 'Paris B 123 456 789' | RCS |

#### Paramètres Monétaires

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| currency | STRING(3) | 'EUR' | Code devise ISO |
| currency_symbol | STRING(5) | '€' | Symbole monétaire |

#### Configuration Dynamique (JSONB)

| Colonne | Type JSONB | Description |
|---------|------------|-------------|
| **categories** | ARRAY | Catégories produits (ex: ['burgers', 'sides']) |
| **vat_rates** | ARRAY | Taux TVA autorisés (ex: [5.5, 10.0, 20.0]) |
| **payment_methods** | OBJECT | Méthodes paiement activées |
| **theme_color** | STRING(7) | Couleur thème hex (#FF6B35) |
| **logo_url** | TEXT | URL logo |
| **language** | STRING(5) | Langue (fr-FR, en-US) |
| **timezone** | STRING(50) | Fuseau horaire (Europe/Paris) |

#### Configuration SumUp (JSONB)

```json
{
  "enabled": false,
  "api_key": "",
  "merchant_code": "",
  "affiliate_key": ""
}
```

#### Configuration Imprimante ESC/POS (JSONB)

```json
{
  "enabled": false,
  "type": "epson",         // epson, star, tanca
  "interface": "tcp",       // tcp, usb, printer
  "ip": "",
  "port": 9100,
  "path": "",               // Pour USB/printer
  "auto_print": true
}
```

#### Configuration Email/SMTP (JSONB)

```json
{
  "enabled": false,
  "smtp_host": "",
  "smtp_port": 587,
  "smtp_secure": false,     // true pour port 465
  "smtp_user": "",
  "smtp_password": "",      // ⚠️ En clair dans JSONB
  "from_email": "",
  "from_name": ""
}
```

### Options Sequelize

```javascript
{
  tableName: 'store_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}
```

### Validation Singleton

```javascript
id: {
  type: DataTypes.INTEGER,
  primaryKey: true,
  defaultValue: 1,
  validate: {
    is: /^1$/,  // ⚠️ Force id = 1 uniquement
  },
}
```

**Rôle** : Garantit 1 seule ligne dans la table (pattern singleton)

### Relations

**Aucune relation** (table autonome)

### Méthodes d'Instance

**Aucune méthode personnalisée**

**Suggestion amélioration** :
- `settings.updateSumUpConfig(config)` → Validation avant MAJ
- `settings.testPrinterConnection()` → Test imprimante
- `settings.getSupportedVatRates()` → Getter taux TVA

### Code Review

**✅ Bonnes pratiques** :
- Pattern singleton via validation `id = 1`
- Valeurs par défaut cohérentes (marque FlexPOS)
- JSONB pour configurations flexibles (SumUp, imprimante, email)
- Validation email (isEmail) et website (isUrl)
- Timestamps activés (traçabilité modifications)

**⚠️ Points d'attention** :
- **SMTP password en clair dans JSONB** → Risque sécurité majeur
- Valeurs par défaut fictives (SIRET, VAT, etc.) → À modifier en prod
- Pas de champ `organization_id` (mono-tenant)
- JSONB `categories` et `vat_rates` sans schéma validation
- 192 lignes pour 1 seul model (complexité élevée)

**❌ Problèmes critiques** :
- **Mot de passe SMTP stocké en clair** → Devrait être chiffré (AES) ou via secrets manager
- **Pas de migration pour transformer en multi-tenant** → Besoin organization_id

---

## 🔍 ANALYSE GLOBALE MODELS

### Statistiques

| Métrique | Valeur |
|----------|--------|
| Nombre total models | 9 |
| Lignes code total | ~889 lignes |
| Models avec hooks | 3 (User, Sale, Product via updated_at trigger Sequelize) |
| Models avec méthodes custom | 3 (User, Product, AuditLog) |
| Models avec soft delete | 1 (Product via paranoid) |
| Models singleton | 1 (StoreSettings) |
| Relations Sequelize | 19 |
| Colonnes JSONB | 7 (vat_details, payment_details, closing_report, old_values, new_values, + 3 configs dans StoreSettings) |

### Dépendances Externes

- **bcryptjs** : Hashing PIN (User.js)
- **sequelize** : ORM principal
- **pg** : Driver PostgreSQL

### Points Forts Globaux

1. ✅ **Relations bien définies** : 19 relations Sequelize cohérentes
2. ✅ **Sécurité PIN** : Hash bcrypt automatique avec hooks
3. ✅ **Soft Delete** : Implémenté sur Product (paranoid)
4. ✅ **JSONB flexible** : Configurations dynamiques (payment_details, etc.)
5. ✅ **Audit trail** : Model AuditLog complet avec helper
6. ✅ **Validation Sequelize** : isEmail, isUrl, isIn, min, max
7. ✅ **Méthodes métier** : Product a 7 méthodes utilitaires
8. ✅ **Singleton pattern** : StoreSettings force id = 1

### Points Faibles Globaux

1. ❌ **Mono-tenant** : Aucun champ `organization_id` dans aucune table
2. ❌ **Duplication ticket_number** : Init.sql (trigger SQL) + Sale.js (hook JS) → Conflit potentiel
3. ❌ **SMTP password en clair** : StoreSettings stocke credentials non chiffrés
4. ❌ **Pas de tests unitaires** : Aucun fichier test détecté
5. ⚠️ **Inconsistance timestamps** : Certains models sans updated_at (SaleItem, CashRegister, MenuComposition, AuditLog)
6. ⚠️ **Pas de JSDoc** : Documentation inline absente
7. ⚠️ **Race conditions stock** : Product.decrementStock() sans lock optimiste
8. ⚠️ **Volumétrie non gérée** : Sales et AuditLogs vont grossir sans limite

### Recommandations Transformation Multi-Tenant

#### 1. Ajouter `organization_id` partout

**Models à modifier** :
- User → `organization_id` INTEGER FK NOT NULL
- Product → `organization_id` INTEGER FK NOT NULL
- Sale → `organization_id` INTEGER FK NOT NULL
- CashRegister → `organization_id` INTEGER FK NOT NULL
- StoreSettings → Transformer en 1 ligne par organization

**Migration SQL** :
```sql
-- Créer table organizations
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter FK à toutes les tables
ALTER TABLE users ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE products ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
-- etc.

-- Index pour performances
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_products_org ON products(organization_id);
-- etc.
```

#### 2. Middleware Tenant Isolation

```javascript
// backend/src/middlewares/tenant.js
const tenantMiddleware = (req, res, next) => {
  const organizationId = req.user?.organization_id || req.headers['x-organization-id'];

  if (!organizationId) {
    return res.status(403).json({ error: 'Organization context required' });
  }

  req.organizationId = organizationId;
  next();
};
```

#### 3. Scopes Sequelize par Organization

```javascript
// User.js
User.addScope('byOrganization', (organizationId) => ({
  where: { organization_id: organizationId }
}));

// Usage
const users = await User.scope({ method: ['byOrganization', req.organizationId] }).findAll();
```

#### 4. Résoudre Duplication ticket_number

**Solution recommandée** :
- Supprimer hook JS dans Sale.js (ligne 116-124)
- Garder uniquement trigger SQL dans init.sql
- Ajouter `organization_id` au format ticket : `ORG1-20251115-0001`

```sql
-- Nouveau trigger multi-tenant
CREATE OR REPLACE FUNCTION generate_ticket_number_multitenant()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'ORG' || NEW.organization_id || '-' ||
                       TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                       LPAD(nextval('ticket_number_seq_org' || NEW.organization_id)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 5. Chiffrer SMTP Credentials

```javascript
// StoreSettings.js
const crypto = require('crypto');

StoreSettings.prototype.setSmtpPassword = function(password) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  this.email_config.smtp_password = encrypted;
};

StoreSettings.prototype.getSmtpPassword = function() {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let decrypted = decipher.update(this.email_config.smtp_password, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

---

## 🎯 CHECKLIST PHASE 0.A.2 - MODELS BACKEND

- [x] Lecture intégrale index.js (relations)
- [x] Lecture intégrale User.js (100 lignes)
- [x] Lecture intégrale Product.js (167 lignes)
- [x] Lecture intégrale Sale.js (129 lignes)
- [x] Lecture intégrale SaleItem.js (73 lignes)
- [x] Lecture intégrale CashRegister.js (107 lignes)
- [x] Lecture intégrale MenuComposition.js (46 lignes)
- [x] Lecture intégrale AuditLog.js (90 lignes)
- [x] Lecture intégrale StoreSettings.js (192 lignes)
- [x] Documentation complète créée (BACKEND_MODELS.md)
- [x] Problèmes identifiés (8 critiques, 15 attention)
- [x] Recommandations multi-tenant rédigées

---

**Documentation réalisée par** : Claude Code
**Temps de réalisation** : 2h
**Prochaine étape** : Lecture approfondie des 10 controllers backend → `BACKEND_CONTROLLERS.md`

---

*Fichier généré automatiquement - Phase 0.A.2 complétée*
