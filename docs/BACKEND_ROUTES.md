# 🛣️ DOCUMENTATION ROUTES BACKEND (Express Router)

**Version** : 1.0
**Date** : 2025-11-15
**Auditeur** : Claude Code
**Nombre de routes** : 10 fichiers
**Lignes totales** : 331 lignes
**Endpoints totaux** : 45 routes

---

## 📊 VUE D'ENSEMBLE

### Répartition par Fichier

| Fichier | Lignes | Routes | Middlewares Globaux | Sécurité |
|---------|--------|--------|---------------------|----------|
| auth.js | 35 | 5 | ❌ | ⭐⭐⭐⭐⭐ Rate Limiting |
| users.js | 46 | 5 | authenticateToken | ⭐⭐⭐⭐ Permissions |
| products.js | 31 | 8 | ❌ | ⭐⭐⭐ Auth optionnelle |
| sales.js | 25 | 5 | authenticateToken | ⭐⭐⭐⭐ Permissions |
| cashRegisters.js | 59 | 6 | authenticateToken | ⭐⭐⭐⭐ Permissions granulaires |
| dashboard.js | 29 | 2 | authenticateToken | ⭐⭐⭐ Permissions |
| settings.js | 28 | 3 | ❌ (mixte) | ⭐⭐⭐⭐ 1 route publique |
| logs.js | 34 | 3 | authenticateToken + requireAdmin | ⭐⭐⭐⭐⭐ Admin only |
| printer.js | 22 | 4 | ❌ | ⭐⭐ Auth basique |
| sumup.js | 22 | 4 | ❌ | ⭐⭐ Auth basique |

**Total** : 45 routes API

---

## 🔐 1. auth.js (35 lignes)

**Fichier** : `/backend/src/routes/auth.js`
**Base URL** : `/api/auth`
**Particularité** : **Rate Limiting strict sur login**

### Configuration Rate Limiting

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 tentatives max
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
    },
  },
});
```

**⚠️ CRITIQUE** : Protection brute-force sur authentification

### Routes Définies

| Méthode | Path | Middleware | Controller | Description |
|---------|------|------------|------------|-------------|
| POST | /login | loginLimiter | authController.login | Connexion PIN |
| POST | /logout | authenticateToken | authController.logout | Déconnexion |
| POST | /switch-cashier | authenticateToken | authController.switchCashier | Changement caissier |
| GET | /me | authenticateToken | authController.getMe | User info |
| GET | /permissions | authenticateToken | authController.getPermissions | Permissions rôle |

### Sécurité

**✅ Bonnes pratiques** :
- Rate limiting 5 tentatives / 15 min sur login
- Routes protégées par JWT (sauf login)
- Réponse structurée pour erreurs

**⚠️ Recommandations** :
- Ajouter rate limiting sur /switch-cashier (risque abus)
- Considérer CAPTCHA après 3 échecs

---

## 👥 2. users.js (46 lignes)

**Fichier** : `/backend/src/routes/users.js`
**Base URL** : `/api/users`
**Middleware global** : `authenticateToken` (ligne 8)

### Routes Définies

| Méthode | Path | Permission | Controller | Query Params |
|---------|------|------------|------------|--------------|
| GET | / | USERS_VIEW | getAllUsers | include_inactive |
| GET | /:id | USERS_VIEW | getUserById | - |
| POST | / | USERS_CREATE | createUser | - |
| PUT | /:id | USERS_UPDATE | updateUser | - |
| DELETE | /:id | USERS_DELETE | deleteUser | - |

### Système de Permissions

```javascript
const { PERMISSIONS } = require('../config/permissions');

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), userController.getAllUsers);
```

**Structure CRUD classique** :
- ✅ Toutes routes protégées par auth
- ✅ Permissions granulaires (VIEW/CREATE/UPDATE/DELETE)
- ✅ Commentaires JSDoc sur chaque route

**Code Review** :
- ✅ Middleware global évite répétition
- ✅ Permissions explicites
- ⚠️ Pas de validation body (à gérer en controller)

---

## 📦 3. products.js (31 lignes)

**Fichier** : `/backend/src/routes/products.js`
**Base URL** : `/api/products`
**Particularité** : Auth **optionnelle** sur GET /

### Routes Définies

| Méthode | Path | Auth | Permission | Controller |
|---------|------|------|------------|------------|
| GET | / | **optionalAuthenticate** | - | getAllProducts |
| GET | /export/csv | authenticateToken | PRODUCTS_VIEW | exportProductsCSV |
| GET | /category/:category | ❌ Public | - | getProductsByCategory |
| GET | /:id | ❌ Public | - | getProductById |
| POST | / | authenticateToken | PRODUCTS_CREATE | createProduct |
| PUT | /reorder | authenticateToken | PRODUCTS_UPDATE | updateProductsOrder |
| PUT | /:id | authenticateToken | PRODUCTS_UPDATE | updateProduct |
| DELETE | /:id | authenticateToken | PRODUCTS_DELETE | deleteProduct |

### Auth Optionnelle

**optionalAuthenticate middleware** :
- Si token fourni → valide et injecte req.user
- Si pas de token → continue sans req.user
- Permet filtrage produits inactifs pour admins uniquement

**Use Case** : Affichage catalogue public (frontend menu) + gestion admin

**⚠️ Ordre des routes critique** :
```javascript
router.get('/export/csv', ...);     // AVANT /:id
router.get('/category/:category', ...); // AVANT /:id
router.get('/:id', ...);            // Catch-all à la fin
```

Si inversé, `/export/csv` serait matché comme `/:id` avec id="export" !

**Code Review** :
- ✅ Routes publiques pour consultation produits
- ✅ Ordre correct (spécifiques avant génériques)
- ⚠️ Pas de rate limiting sur routes publiques (risque scraping)

---

## 💰 4. sales.js (25 lignes)

**Fichier** : `/backend/src/routes/sales.js`
**Base URL** : `/api/sales`
**Middleware global** : `authenticateToken` (ligne 8)

### Routes Définies

| Méthode | Path | Permission | Controller | Description |
|---------|------|------------|------------|-------------|
| POST | / | SALES_CREATE | createSale | Créer vente |
| GET | / | SALES_VIEW | getAllSales | Liste ventes |
| GET | /export/csv | SALES_VIEW | exportSalesCSV | Export CSV |
| GET | /:id | SALES_VIEW | getSaleById | Détail vente |
| GET | /:id/pdf | SALES_VIEW | generateTicketPDFEndpoint | PDF ticket |

**Code Review** :
- ✅ Toutes routes protégées
- ✅ Permission SALES_CREATE séparée de SALES_VIEW
- ✅ Ordre routes correct (/export/csv avant /:id)
- ⚠️ Pas de route DELETE/PATCH (annulation vente à gérer ?)

---

## 💵 5. cashRegisters.js (59 lignes)

**Fichier** : `/backend/src/routes/cashRegisters.js`
**Base URL** : `/api/cash-registers`
**Middleware global** : `authenticateToken` (ligne 15)
**Particularité** : **Permissions granulaires** avec `requireAnyPermission`

### Routes Définies

| Méthode | Path | Permissions | Controller | Description |
|---------|------|-------------|------------|-------------|
| GET | / | VIEW ou VIEW_ALL | getAllCashRegisters | Liste caisses |
| GET | /active | VIEW ou VIEW_ALL | getActiveCashRegister | Caisse ouverte user |
| GET | /export/csv | VIEW_ALL | exportCashRegistersCSV | Export CSV |
| POST | /open | CASH_REGISTER_OPEN | openCashRegister | Ouvrir caisse |
| POST | /:id/close | CASH_REGISTER_CLOSE | closeCashRegister | Fermer caisse |
| GET | /:id | VIEW ou VIEW_ALL | getCashRegisterById | Détail caisse |

### Permissions Granulaires

**requireAnyPermission** : Accepte **au moins une** permission de la liste

```javascript
router.get('/', requireAnyPermission([
  PERMISSIONS.CASH_REGISTER_VIEW,      // Caissier : voit SA caisse
  PERMISSIONS.CASH_REGISTER_VIEW_ALL   // Admin : voit TOUTES les caisses
]), getAllCashRegisters);
```

**Distinction VIEW vs VIEW_ALL** :
- `VIEW` : Utilisateur voit uniquement ses propres caisses
- `VIEW_ALL` : Admin voit toutes les caisses

**Code Review** :
- ✅ Permissions granulaires bien pensées
- ✅ Ordre routes correct (/active et /export/csv avant /:id)
- ✅ Commentaires JSDoc détaillés
- ⚠️ Filtrage VIEW vs VIEW_ALL géré en controller (pas route)

---

## 📊 6. dashboard.js (29 lignes)

**Fichier** : `/backend/src/routes/dashboard.js`
**Base URL** : `/api/dashboard`
**Middleware global** : `authenticateToken` (ligne 11)

### Routes Définies

| Méthode | Path | Permission | Controller | Query Params |
|---------|------|------------|------------|--------------|
| GET | /stats | DASHBOARD_VIEW | getDashboardStats | period (today/week/month/year) |
| GET | /sales-by-category | DASHBOARD_VIEW | getSalesByCategory | period |

**Code Review** :
- ✅ Routes simples et claires
- ✅ Permission unique DASHBOARD_VIEW
- ✅ Query params documentés en commentaires
- ⚠️ Pas de cache (Redis recommandé pour stats)

---

## ⚙️ 7. settings.js (28 lignes)

**Fichier** : `/backend/src/routes/settings.js`
**Base URL** : `/api/settings`
**Particularité** : **1 route publique** (/config)

### Routes Définies

| Méthode | Path | Auth | Permission | Controller | Description |
|---------|------|------|------------|------------|-------------|
| GET | /config | ❌ **Public** | - | getPublicConfig | Config publique (thème, catégories) |
| GET | / | authenticateToken | - | getSettings | Tous paramètres (admin) |
| PUT | / | authenticateToken | SETTINGS_UPDATE | updateSettings | MAJ paramètres |

### Route Publique /config

**Retourne** :
- categories
- vat_rates
- payment_methods
- theme_color
- currency
- logo_url
- store_name
- language

**Use Case** : Frontend charge thème/config AVANT authentification

**⚠️ Sécurité** :
- ✅ Pas de données sensibles exposées (SIRET, email, etc. exclus)
- ⚠️ Pas de rate limiting sur route publique

**Code Review** :
- ✅ Séparation config publique vs privée
- ✅ Ordre routes correct (/config avant /)
- ⚠️ GET / accessible à tous users authentifiés (devrait être admin only ?)

---

## 📋 8. logs.js (34 lignes)

**Fichier** : `/backend/src/routes/logs.js`
**Base URL** : `/api/logs`
**Middlewares globaux** : `authenticateToken` + `requireAdmin` (lignes 7-8)

### Middlewares Empilés

```javascript
router.use(authenticateToken);
router.use(requireAdmin); // Double vérification : JWT + role = 'admin'
```

### Routes Définies

| Méthode | Path | Controller | Query Params |
|---------|------|------------|--------------|
| GET | / | getAllLogs | start_date, end_date, user_id, action, entity_type, limit, offset |
| GET | /stats | getLogsStats | start_date, end_date |
| GET | /export | exportLogsCSV | start_date, end_date, user_id, action, entity_type |

**Code Review** :
- ✅ **Admin only** strictement appliqué
- ✅ Filtres multiples pour recherche logs
- ✅ Export CSV disponible
- ⚠️ Route /export devrait être /export/csv pour consistance

---

## 🖨️ 9. printer.js (22 lignes)

**Fichier** : `/backend/src/routes/printer.js`
**Base URL** : `/api/printer`
**Middleware** : `authenticateToken` sur toutes routes

### Routes Définies

| Méthode | Path | Controller | Description |
|---------|------|------------|-------------|
| POST | /test | printTest | Test imprimante |
| POST | /sale/:id | reprintSale | Réimprimer ticket vente |
| POST | /x-report | printXReport | Ticket X (rapport intermédiaire) |
| POST | /z-report/:registerId | printZReport | Ticket Z (clôture caisse) |

**Code Review** :
- ✅ Toutes méthodes POST (actions, pas GET)
- ⚠️ Pas de permissions granulaires (tout user authentifié peut imprimer)
- ⚠️ Risque abus : caissier peut réimprimer n'importe quelle vente

**🔧 Recommandation** :
```javascript
router.post('/sale/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.SALES_VIEW), // Ajouter permission
  printerController.reprintSale
);
```

---

## 💳 10. sumup.js (22 lignes)

**Fichier** : `/backend/src/routes/sumup.js`
**Base URL** : `/api/sumup`
**Middleware** : `authenticateToken` sur toutes routes

### Routes Définies

| Méthode | Path | Controller | Description |
|---------|------|------------|-------------|
| GET | /status | getStatus | Vérifier config SumUp |
| POST | /checkout | createCheckout | Créer session paiement |
| GET | /checkout/:checkoutId | getCheckoutStatus | Statut transaction |
| POST | /process | processPayment | Traiter paiement |

**Code Review** :
- ✅ Auth requise sur toutes routes
- ⚠️ Pas de permissions (tout user peut créer checkout)
- ⚠️ Manque validation montant minimum/maximum

---

## 🔍 ANALYSE GLOBALE ROUTES

### Statistiques

| Métrique | Valeur |
|----------|--------|
| Fichiers totaux | 10 |
| Lignes totales code | 331 |
| Routes totales | 45 |
| Routes publiques | 3 (products, settings/config) |
| Routes admin only | 3 (logs) |
| Routes avec permissions | 28 |
| Routes avec rate limiting | 1 (auth/login) |

### Patterns Communs

#### 1. Middleware Global

```javascript
// Pattern : Appliquer auth sur toutes routes
router.use(authenticateToken);

router.get('/', controller.getAll);
router.post('/', controller.create);
// etc.
```

**Fichiers utilisant ce pattern** :
- users.js
- sales.js
- cashRegisters.js
- dashboard.js
- logs.js

#### 2. Permissions Granulaires

```javascript
const { PERMISSIONS } = require('../config/permissions');

router.post('/',
  requirePermission(PERMISSIONS.USERS_CREATE),
  userController.createUser
);
```

**Fichiers utilisant permissions** :
- users.js (USERS_*)
- products.js (PRODUCTS_*)
- sales.js (SALES_*)
- cashRegisters.js (CASH_REGISTER_*)
- dashboard.js (DASHBOARD_VIEW)
- settings.js (SETTINGS_UPDATE)

#### 3. Ordre Routes (Spécifiques avant Génériques)

```javascript
// ✅ BON ORDRE
router.get('/export/csv', ...);      // Route spécifique
router.get('/category/:category', ...); // Route spécifique
router.get('/:id', ...);             // Route générique (catch-all)

// ❌ MAUVAIS ORDRE
router.get('/:id', ...);             // Intercepte tout !
router.get('/export/csv', ...);      // Jamais atteint
```

**Fichiers respectant ce pattern** :
- products.js ✅
- sales.js ✅
- cashRegisters.js ✅

#### 4. Commentaires JSDoc

```javascript
/**
 * @route   GET /api/users
 * @desc    Récupérer tous les utilisateurs
 * @access  Admin only
 * @query   include_inactive - true|false
 */
router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), userController.getAllUsers);
```

**Fichiers avec JSDoc** :
- users.js ✅
- cashRegisters.js ✅
- dashboard.js ✅
- settings.js ✅
- logs.js ✅

### Points Forts Globaux

1. ✅ **Rate Limiting** sur login (protection brute-force)
2. ✅ **Permissions granulaires** bien structurées
3. ✅ **Middleware global** évite duplication code
4. ✅ **Ordre routes** respecté (spécifiques avant génériques)
5. ✅ **Commentaires JSDoc** sur majorité des routes
6. ✅ **Admin only** strictement appliqué (logs)
7. ✅ **Auth optionnelle** pour routes publiques (products)
8. ✅ **Export CSV** disponible sur ressources principales

### Points Faibles Globaux

1. ❌ **Pas de validation body** au niveau route (Joi/Zod recommandé)
2. ⚠️ **Pas de rate limiting** sur routes publiques (scraping risk)
3. ⚠️ **Printer routes** sans permissions (tout user peut imprimer)
4. ⚠️ **SumUp routes** sans permissions (risque abus paiements)
5. ⚠️ **GET /settings** accessible à tous users (devrait être admin only)
6. ⚠️ **Inconsistance nommage** : /export vs /export/csv
7. ⚠️ **Pas de versionning API** (/api/v1/...)
8. ⚠️ **Pas de healthcheck** (/health, /status)

### Recommandations Sécurité

#### 1. Ajouter Validation Body (Joi)

```javascript
const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(100).required(),
  pin_code: Joi.string().pattern(/^\d{4}$/).required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'cashier').default('cashier'),
});

const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
    });
  }
  next();
};

router.post('/',
  authenticateToken,
  validateBody(createUserSchema), // Validation ici !
  requirePermission(PERMISSIONS.USERS_CREATE),
  userController.createUser
);
```

#### 2. Ajouter Rate Limiting Global

```javascript
// /backend/src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,                  // 60 requêtes max
  message: { error: 'Trop de requêtes, ralentissez !' }
});

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,                  // Plus restrictif pour public
});

// Dans app.js
app.use('/api', apiLimiter);
app.use('/api/products', publicLimiter);
app.use('/api/settings/config', publicLimiter);
```

#### 3. Ajouter Permissions Manquantes

```javascript
// printer.js
router.post('/sale/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.SALES_VIEW), // Ajout
  printerController.reprintSale
);

// sumup.js
router.post('/checkout',
  authenticateToken,
  requirePermission(PERMISSIONS.SALES_CREATE), // Ajout
  sumupController.createCheckout
);

// settings.js
router.get('/',
  authenticateToken,
  requirePermission(PERMISSIONS.SETTINGS_VIEW), // Ajout (admin only)
  settingsController.getSettings
);
```

#### 4. Versionning API

```javascript
// /backend/src/app.js
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
// ...

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
// ...

// Maintenir rétro-compatibilité
app.use('/api/auth', authRoutes); // Alias v1 par défaut
```

#### 5. Healthcheck Route

```javascript
// /backend/src/routes/health.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

router.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
    });
  }
});

module.exports = router;

// Dans app.js
app.use('/health', require('./routes/health'));
```

### Recommandations Multi-Tenant

#### Middleware Tenant Isolation

```javascript
// /backend/src/middlewares/tenant.js
const tenantMiddleware = (req, res, next) => {
  const organizationId = req.user?.organization_id;

  if (!organizationId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'MISSING_ORGANIZATION',
        message: 'Organization context required'
      }
    });
  }

  req.organizationId = organizationId;
  next();
};

module.exports = { tenantMiddleware };

// Appliquer sur toutes routes protégées
// users.js
router.use(authenticateToken);
router.use(tenantMiddleware); // Ajout

// products.js, sales.js, cashRegisters.js, etc.
```

#### Filtrage Organisation dans Controllers

Après ajout middleware tenant, controllers filtrent automatiquement :

```javascript
// userController.js - getAllUsers
const users = await User.findAll({
  where: {
    organization_id: req.organizationId, // Filtrage auto
    is_active: true
  }
});
```

---

## 🎯 CHECKLIST PHASE 0.A.2 - ROUTES BACKEND

- [x] Lecture intégrale 10 routes (331 lignes)
- [x] Documentation complète créée (BACKEND_ROUTES.md)
- [x] 45 routes documentées
- [x] Patterns sécurité identifiés
- [x] 8 recommandations sécurité rédigées
- [x] Recommandations multi-tenant incluses

---

## 📋 TABLEAU RÉCAPITULATIF COMPLET DES ROUTES

| # | Méthode | Path Complet | Auth | Permission | Controller | Public |
|---|---------|--------------|------|------------|------------|--------|
| 1 | POST | /api/auth/login | ❌ | - | authController.login | ✅ |
| 2 | POST | /api/auth/logout | ✅ | - | authController.logout | ❌ |
| 3 | POST | /api/auth/switch-cashier | ✅ | - | authController.switchCashier | ❌ |
| 4 | GET | /api/auth/me | ✅ | - | authController.getMe | ❌ |
| 5 | GET | /api/auth/permissions | ✅ | - | authController.getPermissions | ❌ |
| 6 | GET | /api/users | ✅ | USERS_VIEW | userController.getAllUsers | ❌ |
| 7 | GET | /api/users/:id | ✅ | USERS_VIEW | userController.getUserById | ❌ |
| 8 | POST | /api/users | ✅ | USERS_CREATE | userController.createUser | ❌ |
| 9 | PUT | /api/users/:id | ✅ | USERS_UPDATE | userController.updateUser | ❌ |
| 10 | DELETE | /api/users/:id | ✅ | USERS_DELETE | userController.deleteUser | ❌ |
| 11 | GET | /api/products | 🟡 Opt | - | productController.getAllProducts | ✅ |
| 12 | GET | /api/products/export/csv | ✅ | PRODUCTS_VIEW | productController.exportProductsCSV | ❌ |
| 13 | GET | /api/products/category/:cat | ❌ | - | productController.getProductsByCategory | ✅ |
| 14 | GET | /api/products/:id | ❌ | - | productController.getProductById | ✅ |
| 15 | POST | /api/products | ✅ | PRODUCTS_CREATE | productController.createProduct | ❌ |
| 16 | PUT | /api/products/reorder | ✅ | PRODUCTS_UPDATE | productController.updateProductsOrder | ❌ |
| 17 | PUT | /api/products/:id | ✅ | PRODUCTS_UPDATE | productController.updateProduct | ❌ |
| 18 | DELETE | /api/products/:id | ✅ | PRODUCTS_DELETE | productController.deleteProduct | ❌ |
| 19 | POST | /api/sales | ✅ | SALES_CREATE | saleController.createSale | ❌ |
| 20 | GET | /api/sales | ✅ | SALES_VIEW | saleController.getAllSales | ❌ |
| 21 | GET | /api/sales/export/csv | ✅ | SALES_VIEW | saleController.exportSalesCSV | ❌ |
| 22 | GET | /api/sales/:id | ✅ | SALES_VIEW | saleController.getSaleById | ❌ |
| 23 | GET | /api/sales/:id/pdf | ✅ | SALES_VIEW | saleController.generateTicketPDFEndpoint | ❌ |
| 24 | GET | /api/cash-registers | ✅ | VIEW/VIEW_ALL | getAllCashRegisters | ❌ |
| 25 | GET | /api/cash-registers/active | ✅ | VIEW/VIEW_ALL | getActiveCashRegister | ❌ |
| 26 | GET | /api/cash-registers/export/csv | ✅ | VIEW_ALL | exportCashRegistersCSV | ❌ |
| 27 | POST | /api/cash-registers/open | ✅ | CASH_REGISTER_OPEN | openCashRegister | ❌ |
| 28 | POST | /api/cash-registers/:id/close | ✅ | CASH_REGISTER_CLOSE | closeCashRegister | ❌ |
| 29 | GET | /api/cash-registers/:id | ✅ | VIEW/VIEW_ALL | getCashRegisterById | ❌ |
| 30 | GET | /api/dashboard/stats | ✅ | DASHBOARD_VIEW | getDashboardStats | ❌ |
| 31 | GET | /api/dashboard/sales-by-category | ✅ | DASHBOARD_VIEW | getSalesByCategory | ❌ |
| 32 | GET | /api/settings/config | ❌ | - | settingsController.getPublicConfig | ✅ |
| 33 | GET | /api/settings | ✅ | - | settingsController.getSettings | ❌ |
| 34 | PUT | /api/settings | ✅ | SETTINGS_UPDATE | settingsController.updateSettings | ❌ |
| 35 | GET | /api/logs | ✅ | Admin | logsController.getAllLogs | ❌ |
| 36 | GET | /api/logs/stats | ✅ | Admin | logsController.getLogsStats | ❌ |
| 37 | GET | /api/logs/export | ✅ | Admin | logsController.exportLogsCSV | ❌ |
| 38 | POST | /api/printer/test | ✅ | - | printerController.printTest | ❌ |
| 39 | POST | /api/printer/sale/:id | ✅ | - | printerController.reprintSale | ❌ |
| 40 | POST | /api/printer/x-report | ✅ | - | printerController.printXReport | ❌ |
| 41 | POST | /api/printer/z-report/:regId | ✅ | - | printerController.printZReport | ❌ |
| 42 | GET | /api/sumup/status | ✅ | - | sumupController.getStatus | ❌ |
| 43 | POST | /api/sumup/checkout | ✅ | - | sumupController.createCheckout | ❌ |
| 44 | GET | /api/sumup/checkout/:id | ✅ | - | sumupController.getCheckoutStatus | ❌ |
| 45 | POST | /api/sumup/process | ✅ | - | sumupController.processPayment | ❌ |

**Légende Auth** :
- ✅ : authenticateToken requis
- ❌ : Public (pas d'auth)
- 🟡 Opt : Auth optionnelle

**Routes publiques** : 3 (/api/auth/login, /api/products, /api/settings/config)

---

**Documentation réalisée par** : Claude Code
**Temps de réalisation** : 1h
**Prochaine étape** : Lecture services backend → `BACKEND_SERVICES.md`

---

*Fichier généré automatiquement - Phase 0.A.2 (routes) complétée*
