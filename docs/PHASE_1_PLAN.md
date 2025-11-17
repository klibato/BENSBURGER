# PHASE 1 - MULTI-TENANT TRANSFORMATION

**Date de début**: 2025-11-16
**Statut**: 🚀 **EN COURS**
**Objectif**: Transformer l'application mono-tenant en plateforme SaaS multi-tenant

---

## 🎯 OBJECTIFS

### Résultat Final
Chaque restaurant/commerce pourra avoir son propre "espace" avec:
- Ses propres utilisateurs
- Ses propres produits
- Ses propres ventes
- Ses propres paramètres
- **Isolation totale des données** entre organisations

### Cas d'usage
```
Organisation 1: Ben's Burger (Paris)
- Users: admin_paris, cashier_paris_1, cashier_paris_2
- Products: 30 burgers/sides/drinks
- Sales: Toutes les ventes Paris

Organisation 2: Pizza Express (Lyon)
- Users: admin_lyon, cashier_lyon_1
- Products: 25 pizzas/salades/desserts
- Sales: Toutes les ventes Lyon

⚠️ ISOLATION: admin_paris NE PEUT PAS voir les données de Pizza Express
```

---

## 📋 PLAN D'EXÉCUTION

### PHASE 1.A - Base de données Multi-Tenant

#### Tâche 1: Créer table `organizations`

**Fichier**: `database/migrations/014_create_organizations.sql`

```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,                    -- "Ben's Burger Paris"
  slug VARCHAR(100) NOT NULL UNIQUE,             -- "bens-burger-paris" (pour subdomain)
  domain VARCHAR(255) UNIQUE,                    -- "bensburger.com" (domaine personnalisé)

  -- Informations de contact
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Paramètres métier (migré depuis store_settings)
  settings JSONB DEFAULT '{}',                   -- Tous les paramètres du commerce

  -- Abonnement SaaS
  plan VARCHAR(50) DEFAULT 'free',               -- free, starter, premium, enterprise
  status VARCHAR(20) DEFAULT 'active',           -- active, suspended, cancelled
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,

  -- Limites par plan
  max_users INTEGER DEFAULT 3,                   -- Limite utilisateurs
  max_products INTEGER DEFAULT 50,               -- Limite produits

  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP                           -- Soft delete
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);
```

**Migration des données**:
```sql
-- Créer organisation par défaut à partir de store_settings
INSERT INTO organizations (id, name, slug, settings, status, created_at)
SELECT
  1,
  store_name,
  'bens-burger',
  jsonb_build_object(
    'store_description', store_description,
    'address_line1', address_line1,
    'address_line2', address_line2,
    'postal_code', postal_code,
    'city', city,
    'country', country,
    'phone', phone,
    'email', email,
    'website', website,
    'legal_form', legal_form,
    'capital_amount', capital_amount,
    'siret', siret,
    'vat_number', vat_number,
    'rcs', rcs,
    'currency', currency,
    'currency_symbol', currency_symbol,
    'categories', categories,
    'vat_rates', vat_rates,
    'payment_methods', payment_methods,
    'theme_color', theme_color,
    'logo_url', logo_url,
    'language', language,
    'timezone', timezone,
    'sumup_config', sumup_config,
    'printer_config', printer_config,
    'email_config', email_config
  ),
  'active',
  created_at
FROM store_settings
WHERE id = 1;
```

---

#### Tâche 2: Ajouter `organization_id` à toutes les tables

**Fichier**: `database/migrations/015_add_organization_id_to_all_tables.sql`

**Tables à modifier** (8 tables):
1. users
2. products
3. menu_compositions
4. cash_registers
5. sales
6. sale_items
7. audit_logs
8. store_settings (renommer en `organization_settings` ou supprimer)

```sql
-- 1. Users
ALTER TABLE users ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_org_role ON users(organization_id, role);

-- 2. Products
ALTER TABLE products ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_products_org_active ON products(organization_id, is_active, category);

-- 3. Menu Compositions
ALTER TABLE menu_compositions ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_menu_compositions_organization_id ON menu_compositions(organization_id);

-- 4. Cash Registers
ALTER TABLE cash_registers ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_cash_registers_organization_id ON cash_registers(organization_id);
CREATE INDEX idx_cash_registers_org_status ON cash_registers(organization_id, status);

-- 5. Sales
ALTER TABLE sales ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_sales_organization_id ON sales(organization_id);
CREATE INDEX idx_sales_org_date ON sales(organization_id, created_at);

-- 6. Sale Items
ALTER TABLE sale_items ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_sale_items_organization_id ON sale_items(organization_id);

-- 7. Audit Logs
ALTER TABLE audit_logs ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);

-- Supprimer le DEFAULT après migration des données existantes
ALTER TABLE users ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE products ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE menu_compositions ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE cash_registers ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE sales ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE sale_items ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE audit_logs ALTER COLUMN organization_id DROP DEFAULT;
```

**Important**: Le `DEFAULT 1` est temporaire pour la migration. On le supprime après pour forcer l'application à toujours spécifier l'organization_id.

---

### PHASE 1.B - Backend Multi-Tenant

#### Tâche 3: Créer modèle `Organization`

**Fichier**: `backend/src/models/Organization.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Organization = sequelize.define('organizations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255],
    },
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^[a-z0-9-]+$/, // lowercase, numbers, hyphens only
      len: [3, 100],
    },
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: {
      isUrl: true,
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  plan: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'free',
    validate: {
      isIn: [['free', 'starter', 'premium', 'enterprise']],
    },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'suspended', 'cancelled']],
    },
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subscription_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
    },
  },
  max_products: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 1,
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

// Méthode pour vérifier si l'organisation est active
Organization.prototype.isActive = function () {
  return this.status === 'active';
};

// Méthode pour vérifier les limites
Organization.prototype.canAddUser = async function () {
  const userCount = await this.countUsers();
  return userCount < this.max_users;
};

Organization.prototype.canAddProduct = async function () {
  const productCount = await this.countProducts();
  return productCount < this.max_products;
};

module.exports = Organization;
```

---

#### Tâche 4: Mettre à jour TOUS les modèles avec `organization_id`

**Modèles à modifier** (8 modèles):

**Pattern à suivre**:
```javascript
const Model = sequelize.define('table_name', {
  // ... autres colonnes
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
  },
}, {
  // ... options
  defaultScope: {
    // IMPORTANT: Filtre automatique par organization_id
    // Sera surchargé par le middleware
  },
  scopes: {
    withOrganization: {
      include: [{
        model: Organization,
        as: 'organization',
      }],
    },
  },
});
```

**Liste des fichiers à modifier**:
1. `backend/src/models/User.js`
2. `backend/src/models/Product.js`
3. `backend/src/models/MenuComposition.js`
4. `backend/src/models/CashRegister.js`
5. `backend/src/models/Sale.js`
6. `backend/src/models/SaleItem.js`
7. `backend/src/models/AuditLog.js`
8. `backend/src/models/StoreSettings.js` (à supprimer ou renommer)

---

#### Tâche 5: Créer middleware `tenantIsolation`

**Fichier**: `backend/src/middlewares/tenantIsolation.js`

```javascript
const Organization = require('../models/Organization');
const logger = require('../utils/logger');

/**
 * Middleware d'isolation multi-tenant
 *
 * Détecte l'organisation depuis:
 * 1. Sous-domaine (tenant.bensburger.com)
 * 2. Domaine personnalisé (restaurant.com)
 * 3. Header X-Organization-ID (pour API/admin)
 * 4. req.user.organization_id (après auth)
 *
 * Injecte req.organizationId pour tous les contrôleurs
 */
const tenantIsolation = async (req, res, next) => {
  try {
    let organizationId = null;
    let organization = null;

    // Stratégie 1: Depuis le user authentifié (priorité)
    if (req.user && req.user.organization_id) {
      organizationId = req.user.organization_id;
    }

    // Stratégie 2: Header X-Organization-ID (pour admin/API)
    else if (req.headers['x-organization-id']) {
      organizationId = parseInt(req.headers['x-organization-id'], 10);
    }

    // Stratégie 3: Sous-domaine (tenant.bensburger.com)
    else if (req.hostname) {
      const subdomain = req.hostname.split('.')[0];

      // Si ce n'est pas "localhost", "www", ou le domaine principal
      if (subdomain !== 'localhost' && subdomain !== 'www' && subdomain !== 'bensburger') {
        organization = await Organization.findOne({
          where: { slug: subdomain },
        });

        if (organization) {
          organizationId = organization.id;
        }
      }
    }

    // Stratégie 4: Domaine personnalisé
    if (!organizationId && req.hostname !== 'localhost') {
      organization = await Organization.findOne({
        where: { domain: req.hostname },
      });

      if (organization) {
        organizationId = organization.id;
      }
    }

    // Si aucune organisation trouvée, utiliser organisation par défaut (dev mode)
    if (!organizationId) {
      organizationId = 1; // Ben's Burger par défaut
      logger.warn('No organization detected, using default (id=1)');
    }

    // Charger l'organisation si pas déjà chargée
    if (!organization) {
      organization = await Organization.findByPk(organizationId);
    }

    // Vérifier que l'organisation existe et est active
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organisation introuvable',
        },
      });
    }

    if (organization.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_SUSPENDED',
          message: 'Organisation suspendue ou désactivée',
        },
      });
    }

    // Injecter dans la requête
    req.organizationId = organizationId;
    req.organization = organization;

    logger.debug(`Tenant isolation: organization_id=${organizationId} (${organization.name})`);

    next();
  } catch (error) {
    logger.error('Tenant isolation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_ISOLATION_ERROR',
        message: 'Erreur d\'isolation multi-tenant',
      },
    });
  }
};

module.exports = tenantIsolation;
```

---

#### Tâche 6: Mettre à jour tous les contrôleurs

**Pattern de modification**:

**AVANT**:
```javascript
// Récupérer tous les produits
const products = await Product.findAll({
  where: { is_active: true },
});
```

**APRÈS**:
```javascript
// Récupérer tous les produits DE L'ORGANISATION
const products = await Product.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTÉ
    is_active: true,
  },
});
```

**Contrôleurs à modifier** (10 fichiers):
1. `backend/src/controllers/authController.js`
2. `backend/src/controllers/userController.js`
3. `backend/src/controllers/productController.js`
4. `backend/src/controllers/menuController.js`
5. `backend/src/controllers/saleController.js`
6. `backend/src/controllers/cashRegisterController.js`
7. `backend/src/controllers/reportController.js`
8. `backend/src/controllers/auditController.js`
9. `backend/src/controllers/settingsController.js`
10. `backend/src/controllers/printerController.js`

**Règles importantes**:
- ✅ Toujours filtrer par `organization_id: req.organizationId`
- ✅ Toujours définir `organization_id` lors de la création
- ✅ Empêcher l'accès cross-tenant (vérifier organization_id)
- ❌ Ne JAMAIS permettre de changer organization_id

---

#### Tâche 7: Mettre à jour les routes

**Fichier**: `backend/src/routes/index.js`

```javascript
const tenantIsolation = require('../middlewares/tenantIsolation');

// IMPORTANT: tenantIsolation APRÈS authenticateToken
router.use('/products', authenticateToken, tenantIsolation, productRoutes);
router.use('/sales', authenticateToken, tenantIsolation, saleRoutes);
router.use('/users', authenticateToken, tenantIsolation, userRoutes);
// ... toutes les autres routes
```

**Ordre des middlewares** (critique):
1. `authenticateToken` → Vérifie JWT, injecte `req.user`
2. `tenantIsolation` → Extrait organization_id depuis req.user
3. `requireAdmin` / autres middlewares métier

---

### PHASE 1.C - Système d'inscription Multi-Tenant

#### Tâche 8: Endpoint d'inscription organisation

**Fichier**: `backend/src/controllers/organizationController.js` (NOUVEAU)

```javascript
/**
 * POST /api/organizations/register
 * Inscription d'une nouvelle organisation
 */
const register = async (req, res) => {
  try {
    const {
      organizationName,
      slug,
      adminUsername,
      adminEmail,
      adminPassword
    } = req.body;

    // Validation
    if (!organizationName || !slug || !adminUsername || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Champs requis manquants'
        },
      });
    }

    // Vérifier slug disponible
    const existingOrg = await Organization.findOne({ where: { slug } });
    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SLUG_TAKEN',
          message: 'Ce nom d\'organisation est déjà pris'
        },
      });
    }

    // Transaction: Créer organisation + admin
    const result = await sequelize.transaction(async (t) => {
      // 1. Créer organisation
      const organization = await Organization.create({
        name: organizationName,
        slug: slug.toLowerCase(),
        email: adminEmail,
        plan: 'free',
        status: 'active',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      }, { transaction: t });

      // 2. Créer utilisateur admin
      const admin = await User.create({
        organization_id: organization.id,
        username: adminUsername,
        pin_code: adminPassword, // Sera hashé par le hook
        role: 'admin',
        email: adminEmail,
        is_active: true,
      }, { transaction: t });

      return { organization, admin };
    });

    res.status(201).json({
      success: true,
      data: {
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        admin: result.admin.toPublicJSON(),
      },
      message: 'Organisation créée avec succès',
    });

  } catch (error) {
    logger.error('Organization registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Erreur lors de l\'inscription'
      },
    });
  }
};
```

---

### PHASE 1.D - Tests & Validation

#### Tâche 9: Tests d'isolation multi-tenant

**Scénarios de test**:

1. **Test création organisations**
   ```bash
   # Créer 2 organisations
   POST /api/organizations/register
   { "organizationName": "Pizza Express", "slug": "pizza-express", ... }

   POST /api/organizations/register
   { "organizationName": "Sushi Bar", "slug": "sushi-bar", ... }
   ```

2. **Test isolation produits**
   ```bash
   # Admin Pizza Express crée un produit
   POST /api/products (avec token Pizza Express)
   { "name": "Pizza Margherita", ... }

   # Admin Sushi Bar NE DOIT PAS voir la pizza
   GET /api/products (avec token Sushi Bar)
   # Résultat: [] (vide)
   ```

3. **Test tentative accès cross-tenant**
   ```bash
   # Admin Pizza Express essaie d'accéder à un produit de Sushi Bar
   GET /api/products/:sushi_product_id (avec token Pizza Express)
   # Résultat: 404 NOT_FOUND
   ```

4. **Test ventes isolées**
   ```bash
   # Vente Pizza Express
   POST /api/sales (token Pizza Express)

   # Rapport Sushi Bar ne doit PAS inclure les ventes Pizza
   GET /api/reports/daily (token Sushi Bar)
   # Résultat: Uniquement ventes Sushi Bar
   ```

---

## 📁 FICHIERS À CRÉER/MODIFIER

### Migrations (2 fichiers)
- ✅ `database/migrations/014_create_organizations.sql`
- ✅ `database/migrations/015_add_organization_id_to_all_tables.sql`

### Modèles (9 fichiers)
- ✅ `backend/src/models/Organization.js` (NOUVEAU)
- ✏️ `backend/src/models/User.js` (modifier)
- ✏️ `backend/src/models/Product.js` (modifier)
- ✏️ `backend/src/models/MenuComposition.js` (modifier)
- ✏️ `backend/src/models/CashRegister.js` (modifier)
- ✏️ `backend/src/models/Sale.js` (modifier)
- ✏️ `backend/src/models/SaleItem.js` (modifier)
- ✏️ `backend/src/models/AuditLog.js` (modifier)
- ❌ `backend/src/models/StoreSettings.js` (supprimer)

### Middlewares (1 fichier)
- ✅ `backend/src/middlewares/tenantIsolation.js` (NOUVEAU)

### Contrôleurs (11 fichiers)
- ✅ `backend/src/controllers/organizationController.js` (NOUVEAU)
- ✏️ `backend/src/controllers/authController.js` (modifier)
- ✏️ `backend/src/controllers/userController.js` (modifier)
- ✏️ `backend/src/controllers/productController.js` (modifier)
- ✏️ `backend/src/controllers/menuController.js` (modifier)
- ✏️ `backend/src/controllers/saleController.js` (modifier)
- ✏️ `backend/src/controllers/cashRegisterController.js` (modifier)
- ✏️ `backend/src/controllers/reportController.js` (modifier)
- ✏️ `backend/src/controllers/auditController.js` (modifier)
- ✏️ `backend/src/controllers/settingsController.js` (modifier)
- ✏️ `backend/src/controllers/printerController.js` (modifier)

### Routes (2 fichiers)
- ✅ `backend/src/routes/organizationRoutes.js` (NOUVEAU)
- ✏️ `backend/src/routes/index.js` (modifier - ajouter tenantIsolation)

### Frontend (optionnel pour PHASE 1)
- ⏳ Page inscription organisation
- ⏳ Sélecteur d'organisation (admin super)
- ⏳ Affichage nom organisation

---

## ⚠️ POINTS D'ATTENTION

### Sécurité Critique

1. **Validation organization_id**
   ```javascript
   // TOUJOURS vérifier que l'utilisateur appartient à l'organisation
   if (user.organization_id !== req.organizationId) {
     return res.status(403).json({ error: 'FORBIDDEN' });
   }
   ```

2. **Empêcher modification organization_id**
   ```javascript
   // NE JAMAIS permettre de changer organization_id
   delete req.body.organization_id; // Avant update
   ```

3. **Requêtes SQL directes**
   ```javascript
   // Si vous utilisez sequelize.query(), TOUJOURS filtrer:
   const [results] = await sequelize.query(
     'SELECT * FROM products WHERE organization_id = ?',
     { replacements: [req.organizationId] }
   );
   ```

### Performance

1. **Indexes organization_id**
   - ✅ Tous créés dans migration 015
   - ✅ Index composites (organization_id, created_at)

2. **Caching**
   - Consider caching organization settings
   - Cache per-tenant (Redis with organization_id as key prefix)

### Compatibilité

1. **Données existantes**
   - Migration 014: Crée organisation "Ben's Burger" (id=1)
   - Migration 015: Associe toutes les données existantes à org id=1
   - ✅ Rétrocompatibilité garantie

2. **Rollback**
   - Si problème, on peut rollback migrations 014 et 015
   - Données existantes restent intactes

---

## 🎯 ORDRE D'EXÉCUTION

### Étape 1: Base de données (Migrations)
1. Créer migration 014 (organizations table)
2. Créer migration 015 (organization_id partout)
3. Tester migrations sur DB de dev
4. Vérifier données migrées

### Étape 2: Backend (Modèles & Middleware)
1. Créer modèle Organization
2. Mettre à jour index.js (associations)
3. Créer middleware tenantIsolation
4. Mettre à jour tous les modèles (organization_id)

### Étape 3: Backend (Contrôleurs)
1. Créer organizationController
2. Mettre à jour authController (signup multi-tenant)
3. Mettre à jour tous les autres contrôleurs (filtrage)

### Étape 4: Routes
1. Créer organizationRoutes
2. Mettre à jour index.js (ajouter tenantIsolation)

### Étape 5: Tests
1. Rebuild Docker
2. Tester inscription organisation
3. Tester isolation données
4. Tester tentatives accès cross-tenant

---

## ✅ CRITÈRES DE SUCCÈS

PHASE 1 sera considérée comme TERMINÉE quand:

- [ ] Table `organizations` créée
- [ ] Toutes les tables ont `organization_id`
- [ ] Modèle Organization fonctionnel
- [ ] Tous les modèles ont organization_id
- [ ] Middleware tenantIsolation opérationnel
- [ ] Tous les contrôleurs filtrent par organization_id
- [ ] Endpoint POST /api/organizations/register fonctionne
- [ ] **Test isolation**: 2 organisations créées, données totalement isolées
- [ ] **Test sécurité**: Impossible d'accéder aux données d'une autre org
- [ ] 0 erreur dans les logs
- [ ] Documentation PHASE 1 mise à jour

---

**Prêt à démarrer ?** Let's code! 🚀
