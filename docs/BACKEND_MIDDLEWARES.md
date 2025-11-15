# BACKEND MIDDLEWARES - Documentation Technique Exhaustive

> **PHASE 0.A.2** - Analyse intégrale des middlewares backend
> **Date**: 2025-11-15
> **Fichiers analysés**: 3 middlewares (332 lignes de code)
> **Objectif**: Documenter tous les middlewares Express pour audit complet

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [auth.js - Authentification JWT et permissions](#authjs---authentification-jwt-et-permissions)
3. [errorHandler.js - Gestion d'erreurs globale](#errorhandlerjs---gestion-derreurs-globale)
4. [audit.js - Logging automatique des actions](#auditjs---logging-automatique-des-actions)
5. [Problèmes détectés](#problèmes-détectés)
6. [Recommandations Multi-Tenant](#recommandations-multi-tenant)
7. [Recommandations Sécurité](#recommandations-sécurité)

---

## Vue d'ensemble

Les **middlewares** sont des fonctions Express qui s'exécutent entre la réception de la requête et l'envoi de la réponse. Ils gèrent l'authentification, les autorisations, la gestion d'erreurs et l'audit.

| Middleware | Lignes | Rôle | Utilisation |
|------------|--------|------|-------------|
| `auth.js` | 186 | Authentification JWT + autorisations | Tous les endpoints protégés |
| `errorHandler.js` | 73 | Gestion d'erreurs centralisée | app.use() global en fin de chaîne |
| `audit.js` | 73 | Logging automatique des actions | Routes spécifiques nécessitant audit |
| **TOTAL** | **332** | - | - |

### ⚠️ Incohérence de structure détectée

Le projet utilise **2 dossiers différents** pour les middlewares :
- `/backend/src/middlewares/` (pluriel) - Contient **auth.js** et **errorHandler.js**
- `/backend/src/middleware/` (singulier) - Contient **audit.js**

👉 **Recommandation** : Uniformiser en déplaçant `audit.js` vers `/backend/src/middlewares/` (pluriel).

---

## auth.js - Authentification JWT et permissions

**Localisation** : `/backend/src/middlewares/auth.js`
**Lignes** : 186 lignes
**Dépendances** : `jsonwebtoken`, `config/env`, `models/User`, `logger`, `config/permissions`
**Pattern** : Middleware Express + Factories

### Vue d'ensemble

Ce middleware gère l'**authentification JWT** et le **système d'autorisation basé sur les permissions**. Il expose 5 middlewares différents pour différents niveaux de sécurité.

### Middleware 1 : `authenticateToken` (lignes 8-73)

**Rôle** : Vérifier le token JWT et attacher l'utilisateur à `req.user`.

**Signature** :
```javascript
const authenticateToken = async (req, res, next) => { ... }
```

**Flux d'exécution** :

```javascript
// 1. Extraire le token depuis le header Authorization
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

if (!token) {
  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Token manquant' },
  });
}

// 2. Vérifier le token avec JWT
const decoded = jwt.verify(token, config.jwt.secret);

// 3. Récupérer l'utilisateur depuis la BDD
const user = await User.findByPk(decoded.userId);

if (!user || !user.is_active) {
  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Utilisateur invalide ou inactif' },
  });
}

// 4. Attacher l'utilisateur à la requête
req.user = user;
next();
```

**Gestion d'erreurs JWT** :

| Erreur | Code | Message | Status |
|--------|------|---------|--------|
| `JsonWebTokenError` | `UNAUTHORIZED` | "Token invalide" | 401 |
| `TokenExpiredError` | `UNAUTHORIZED` | "Token expiré" | 401 |
| Autre | `INTERNAL_ERROR` | "Erreur lors de l'authentification" | 500 |

**Utilisation** :
```javascript
// Dans les routes
router.get('/sales', authenticateToken, saleController.getAllSales);
```

**Payload JWT attendu** :
```json
{
  "userId": 123,
  "iat": 1700000000,
  "exp": 1700086400
}
```

**✅ Points forts** :
- Vérification du statut `is_active` de l'utilisateur
- Gestion des erreurs JWT spécifiques
- Logging des erreurs

**⚠️ Points d'amélioration** :
- ❌ Pas de **blacklist de tokens** (impossibilité de révoquer un token avant expiration)
- ❌ Pas de **refresh token** (obligation de se reconnecter après expiration)
- ❌ Pas de vérification du **rôle** (juste authentification, pas autorisation)

### Middleware 2 : `optionalAuthenticate` (lignes 75-95)

**Rôle** : Authentifier l'utilisateur **si un token est présent**, mais ne pas bloquer si absent.

**Signature** :
```javascript
const optionalAuthenticate = async (req, res, next) => { ... }
```

**Flux d'exécution** :
```javascript
try {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.userId);

    if (user && user.is_active) {
      req.user = user;
    }
  }
} catch (error) {
  // Ignorer les erreurs et continuer sans utilisateur
  logger.debug('Erreur d\'authentification optionnelle:', error.message);
}

next(); // Toujours continuer
```

**Cas d'usage** :
- Routes publiques qui adaptent le contenu selon l'utilisateur (ex: dashboard public vs privé)
- Endpoints qui retournent plus de données si authentifié

**Exemple** :
```javascript
router.get('/public-stats', optionalAuthenticate, dashboardController.getPublicStats);
```

**✅ Points forts** :
- Ne bloque jamais la requête
- Utile pour les routes hybrides public/privé

**⚠️ Points d'amélioration** :
- ❌ Les erreurs JWT sont ignorées silencieusement (peut cacher des problèmes de config)

### Middleware 3 : `requireAdmin` (lignes 97-109)

**Rôle** : Vérifier que l'utilisateur connecté a le rôle **admin**.

**Signature** :
```javascript
const requireAdmin = (req, res, next) => { ... }
```

**Implémentation** :
```javascript
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Accès réservé aux administrateurs',
      },
    });
  }
  next();
};
```

**⚠️ ATTENTION** : Ce middleware **suppose que `req.user` existe** (pas de vérification).

👉 **Utilisation correcte** :
```javascript
// ✅ Correct : authenticateToken AVANT requireAdmin
router.delete('/users/:id', authenticateToken, requireAdmin, userController.deleteUser);

// ❌ Incorrect : requireAdmin sans authenticateToken
router.delete('/users/:id', requireAdmin, userController.deleteUser); // CRASH si req.user undefined
```

**Rôles existants** (d'après models/User.js) :
- `admin` : Administrateur
- `manager` : Gérant
- `cashier` : Caissier

**Cas d'usage** :
- Routes d'administration (gestion utilisateurs, settings, logs)

### Middleware 4 : `requirePermission(permission)` (lignes 111-143)

**Rôle** : Vérifier qu'un utilisateur possède une **permission spécifique**.

**Signature** :
```javascript
const requirePermission = (permission) => {
  return (req, res, next) => { ... };
};
```

**Pattern** : **Middleware Factory** (retourne un middleware configuré).

**Implémentation** :
```javascript
const requirePermission = (permission) => {
  return (req, res, next) => {
    // 1. Vérifier que req.user existe
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentification requise' },
      });
    }

    // 2. Vérifier la permission via hasPermission()
    if (!hasPermission(req.user.role, permission)) {
      logger.warn(
        `User ${req.user.id} (${req.user.role}) denied access: missing permission ${permission}`
      );
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Permission insuffisante' },
      });
    }

    next();
  };
};
```

**Utilisation** :
```javascript
// Importer depuis config/permissions.js
const { PERMISSIONS } = require('../config/permissions');

// Protéger une route
router.post('/products', authenticateToken, requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.createProduct);
```

**Dépendance** : Fonction `hasPermission(role, permission)` depuis `config/permissions.js`.

**Système de permissions** (d'après le code) :
```javascript
// config/permissions.js (assumé)
const PERMISSIONS = {
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_USERS: 'manage_users',
  VIEW_SALES: 'view_sales',
  // ... etc
};

const ROLE_PERMISSIONS = {
  admin: ['*'], // Toutes les permissions
  manager: ['manage_products', 'view_sales', 'manage_settings'],
  cashier: ['create_sale', 'view_products'],
};

const hasPermission = (role, permission) => {
  if (ROLE_PERMISSIONS[role].includes('*')) return true;
  return ROLE_PERMISSIONS[role].includes(permission);
};
```

**✅ Points forts** :
- Logging des refus d'accès (utile pour détecter les abus)
- Vérification explicite de `req.user` (évite les crashs)

**⚠️ Points d'amélioration** :
- ❌ Pas de **permissions au niveau utilisateur** (uniquement basé sur le rôle)
- ❌ Pas de **permissions granulaires** (ex: "modifier SEULEMENT ses propres ventes")

### Middleware 5 : `requireAnyPermission(permissions)` (lignes 145-177)

**Rôle** : Vérifier qu'un utilisateur possède **au moins une** des permissions listées (OR logique).

**Signature** :
```javascript
const requireAnyPermission = (permissions) => {
  return (req, res, next) => { ... };
};
```

**Pattern** : **Middleware Factory** (comme `requirePermission`).

**Implémentation** :
```javascript
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentification requise' },
      });
    }

    // Fonction hasAnyPermission() depuis config/permissions.js
    if (!hasAnyPermission(req.user.role, permissions)) {
      logger.warn(
        `User ${req.user.id} (${req.user.role}) denied access: missing any of ${permissions.join(', ')}`
      );
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Permission insuffisante' },
      });
    }

    next();
  };
};
```

**Utilisation** :
```javascript
// Permettre l'accès si l'utilisateur a manage_products OU manage_inventory
router.put('/products/:id',
  authenticateToken,
  requireAnyPermission(['manage_products', 'manage_inventory']),
  productController.updateProduct
);
```

**Cas d'usage** :
- Routes accessibles par plusieurs rôles différents
- Permissions alternatives (ex: "admin OU gérant")

**✅ Points forts** :
- Flexibilité pour les routes multi-rôles
- Logging détaillé des permissions manquantes

### Export

```javascript
module.exports = {
  authenticateToken,
  optionalAuthenticate,
  requireAdmin,
  requirePermission,
  requireAnyPermission,
};
```

5 middlewares exportés.

---

## errorHandler.js - Gestion d'erreurs globale

**Localisation** : `/backend/src/middlewares/errorHandler.js`
**Lignes** : 73 lignes
**Dépendances** : `logger`
**Pattern** : Middleware Express Error Handler (4 arguments)

### Vue d'ensemble

Ce fichier contient **2 middlewares** :
1. `errorHandler` : Gestionnaire d'erreurs global (Express 4 arguments)
2. `notFoundHandler` : Gestionnaire 404 pour routes inexistantes

### Middleware 1 : `errorHandler` (lignes 4-56)

**Rôle** : Intercepter toutes les erreurs non gérées dans l'application et retourner une réponse JSON standardisée.

**Signature** :
```javascript
const errorHandler = (err, req, res, next) => { ... }
```

**⚠️ Middleware Express à 4 arguments** : Express détecte automatiquement qu'il s'agit d'un error handler grâce aux 4 paramètres.

**Flux d'exécution** :

```javascript
const errorHandler = (err, req, res, next) => {
  // 1. Logger l'erreur
  logger.error('Erreur non gérée:', err);

  // 2. Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: err.errors.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      },
    });
  }

  // 3. Erreur de contrainte unique
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'Une ressource avec ces données existe déjà',
        details: err.errors.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      },
    });
  }

  // 4. Erreur 404
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.message || 'Ressource non trouvée',
      },
    });
  }

  // 5. Erreur par défaut
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Une erreur est survenue',
    },
  });
};
```

**Types d'erreurs gérées** :

| Type d'erreur | Status | Code | Exemple |
|---------------|--------|------|---------|
| `SequelizeValidationError` | 400 | `VALIDATION_ERROR` | Email invalide, champ manquant |
| `SequelizeUniqueConstraintError` | 409 | `DUPLICATE_ERROR` | Username déjà existant |
| `err.status === 404` | 404 | `NOT_FOUND` | Produit introuvable |
| Défaut | 500 | `INTERNAL_ERROR` | Toute autre erreur |

**Exemple de réponse pour erreur de validation** :
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": [
      {
        "field": "email",
        "message": "Validation isEmail on email failed"
      },
      {
        "field": "price",
        "message": "price must be >= 0"
      }
    ]
  }
}
```

**Exemple de réponse pour contrainte unique** :
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ERROR",
    "message": "Une ressource avec ces données existe déjà",
    "details": [
      {
        "field": "username",
        "message": "username must be unique"
      }
    ]
  }
}
```

**Utilisation dans app.js** :
```javascript
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Routes...
app.use('/api', routes);

// 404 handler (doit être APRÈS les routes)
app.use(notFoundHandler);

// Error handler (doit être EN DERNIER)
app.use(errorHandler);
```

**✅ Points forts** :
- Format de réponse standardisé
- Mapping des erreurs Sequelize vers codes HTTP appropriés
- Logging systématique

**⚠️ Points d'amélioration** :
- ❌ Pas de gestion des **erreurs de foreign key** (SequelizeForeignKeyConstraintError)
- ❌ Pas de masquage des **stack traces en production** (risque de fuite d'infos sensibles)
- ❌ Pas de gestion des **erreurs async** non catchées (nécessite express-async-errors ou try/catch partout)

### Middleware 2 : `notFoundHandler` (lignes 58-67)

**Rôle** : Gérer les routes qui n'existent pas (404).

**Signature** :
```javascript
const notFoundHandler = (req, res) => { ... }
```

**⚠️ Middleware à 2 arguments** : Pas de `next()` car c'est le dernier middleware.

**Implémentation** :
```javascript
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} non trouvée`,
    },
  });
};
```

**Exemple de réponse** :
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /api/invalid-route non trouvée"
  }
}
```

**Placement dans app.js** :
```javascript
// APRÈS toutes les routes définies
app.use('/api', routes);

// AVANT le error handler
app.use(notFoundHandler); // ← Ici
app.use(errorHandler);
```

**✅ Points forts** :
- Message explicite avec méthode et chemin
- Format cohérent avec les autres erreurs

### Export

```javascript
module.exports = {
  errorHandler,
  notFoundHandler,
};
```

2 middlewares exportés.

---

## audit.js - Logging automatique des actions

**Localisation** : `/backend/src/middleware/audit.js` ⚠️ (singulier, incohérence)
**Lignes** : 73 lignes
**Dépendances** : `models/AuditLog`, `logger`
**Pattern** : Middleware Factory + Helper

### Vue d'ensemble

Ce middleware permet de **logger automatiquement** certaines actions utilisateur dans la table `audit_logs`. Il fonctionne en "wrappant" la méthode `res.json()` pour intercepter la réponse.

### Middleware Factory : `auditMiddleware(action, entityType)` (lignes 8-48)

**Rôle** : Créer un middleware qui log automatiquement une action quand la réponse est envoyée.

**Signature** :
```javascript
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => { ... };
};
```

**Pattern** : **Middleware Factory** (retourne un middleware configuré).

**Implémentation** :
```javascript
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // 1. Capturer la réponse originale
    const originalJson = res.json.bind(res);

    // 2. Remplacer res.json() par une version augmentée
    res.json = function (data) {
      // 3. Logger l'action uniquement si la requête a réussi
      if (data.success && req.user) {
        // Extraire l'ID de l'entité depuis la réponse ou les params
        const entityId = data.data?.id || req.params.id || null;

        // Extraire les détails pertinents
        const details = {
          newValues: data.data || null,
        };

        // Logger de manière asynchrone (ne pas bloquer la réponse)
        setImmediate(async () => {
          try {
            await AuditLog.log({
              userId: req.user.id,
              action,
              entityType,
              entityId,
              details,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
            });
          } catch (error) {
            logger.error('Erreur lors du logging d\'audit:', error);
          }
        });
      }

      // 4. Appeler la méthode originale
      return originalJson(data);
    };

    next();
  };
};
```

**Principe de fonctionnement** :

1. **Wrap `res.json()`** : Remplace temporairement la méthode `res.json()` pour intercepter la réponse
2. **Vérifier le succès** : Ne log que si `data.success === true`
3. **Extraire l'ID** : Cherche l'ID dans `data.data.id` ou `req.params.id`
4. **Logger asynchrone** : Utilise `setImmediate()` pour ne pas bloquer la réponse HTTP
5. **Appeler l'original** : Retourne la réponse normalement

**Utilisation** :
```javascript
const { auditMiddleware } = require('../middleware/audit');

// Auditer la création d'un produit
router.post('/products',
  authenticateToken,
  auditMiddleware('CREATE_PRODUCT', 'product'),
  productController.createProduct
);

// Auditer la suppression d'un utilisateur
router.delete('/users/:id',
  authenticateToken,
  requireAdmin,
  auditMiddleware('DELETE_USER', 'user'),
  userController.deleteUser
);
```

**Actions loguées** (exemples d'après le code) :
- `CREATE_PRODUCT`, `UPDATE_PRODUCT`, `DELETE_PRODUCT`
- `CREATE_USER`, `UPDATE_USER`, `DELETE_USER`
- `CREATE_SALE`, `CANCEL_SALE`
- `OPEN_REGISTER`, `CLOSE_REGISTER`

**Données loguées dans `audit_logs`** :
```javascript
{
  userId: 123,                    // ID de l'utilisateur
  action: 'CREATE_PRODUCT',       // Action effectuée
  entityType: 'product',          // Type d'entité
  entityId: 456,                  // ID de l'entité
  details: {                      // Détails JSON
    newValues: { name: 'Burger', price: 9.90, ... }
  },
  ipAddress: '192.168.1.100',     // IP du client
  userAgent: 'Mozilla/5.0...',    // User-Agent
  createdAt: '2025-11-15T...'     // Timestamp
}
```

**✅ Points forts** :
- **Non-bloquant** : Utilise `setImmediate()` pour ne pas ralentir la réponse
- **Automatique** : Pas besoin de logger manuellement dans chaque controller
- **Sécurisé** : Ne log que si `req.user` existe (authentifié)
- **Conditionnel** : Ne log que les réponses avec `success: true`

**⚠️ Points d'amélioration** :
- ❌ Ne capture pas les **anciennes valeurs** (seulement `newValues`)
- ❌ Pas de capture des **erreurs** (seulement les succès)
- ❌ Dépend de la structure `{ success: true, data: {...} }` (couplage fort)

### Helper : `logAction(req, action, entityType, entityId, details)` (lignes 50-67)

**Rôle** : Logger **manuellement** une action (alternative au middleware automatique).

**Signature** :
```javascript
const logAction = async (req, action, entityType, entityId, details = null) => { ... }
```

**Implémentation** :
```javascript
const logAction = async (req, action, entityType, entityId, details = null) => {
  try {
    await AuditLog.log({
      userId: req.user?.id || null,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    logger.error('Erreur lors du logging manuel d\'audit:', error);
  }
};
```

**Utilisation** :
```javascript
const { logAction } = require('../middleware/audit');

// Dans un controller
const closeCashRegister = async (req, res, next) => {
  try {
    // ... logique de fermeture

    // Logger manuellement
    await logAction(req, 'CLOSE_REGISTER', 'cash_register', cashRegister.id, {
      difference: cashRegister.difference,
      total_sales: cashRegister.total_sales,
    });

    res.json({ success: true, data: cashRegister });
  } catch (error) {
    next(error);
  }
};
```

**Différence avec `auditMiddleware`** :

| Critère | `auditMiddleware` | `logAction` |
|---------|-------------------|-------------|
| Déclenchement | Automatique (wrap res.json) | Manuel (appel explicite) |
| Placement | Middleware dans la route | Dans le controller |
| Détails | Extrait depuis `data.data` | Passé explicitement |
| Anciennes valeurs | ❌ Non | ✅ Possible (si passé) |

**✅ Points forts** :
- Contrôle total sur ce qui est loggué
- Peut logger des actions complexes
- Gère le cas où `req.user` est absent (`userId: null`)

**⚠️ Points d'amélioration** :
- ❌ Ne bloque pas en cas d'erreur de logging (silencieux)
- ❌ Pas de retry en cas d'échec

### Export

```javascript
module.exports = {
  auditMiddleware,
  logAction,
};
```

2 exports (1 middleware factory + 1 helper).

---

## Problèmes détectés

### 🔴 Bugs critiques

| # | Middleware | Ligne | Problème | Impact |
|---|------------|-------|----------|--------|
| 1 | `auth.js` | 99 | `requireAdmin` ne vérifie pas si `req.user` existe | ❌ Crash si utilisé sans `authenticateToken` |
| 2 | Structure | - | Incohérence : 2 dossiers (`middlewares/` et `middleware/`) | ⚠️ Confusion, risque d'erreur d'import |

### ⚠️ Problèmes de sécurité

| # | Middleware | Problème | Recommandation |
|---|------------|----------|----------------|
| 1 | `auth.js` | Pas de blacklist de tokens | Implémenter Redis pour révoquer les tokens |
| 2 | `auth.js` | Pas de refresh token | Ajouter un système de refresh token |
| 3 | `errorHandler.js` | Stack traces exposées en production | Masquer les détails en prod : `if (process.env.NODE_ENV !== 'production') { error.stack }` |
| 4 | `errorHandler.js` | Pas de rate limiting sur les erreurs | Ajouter rate limiting pour éviter les attaques par force brute |

### 🟡 Warnings mineurs

| # | Middleware | Ligne | Problème |
|---|------------|-------|----------|
| 1 | `audit.js` | 15 | Dépend de la structure `{ success: true, data: {...} }` (couplage fort) |
| 2 | `audit.js` | 21 | Ne capture pas les anciennes valeurs (seulement `newValues`) |
| 3 | `errorHandler.js` | - | Pas de gestion des erreurs de foreign key Sequelize |

---

## Recommandations Multi-Tenant

Pour transformer ces middlewares en **multi-tenant**, voici les modifications nécessaires :

### 1. auth.js - Ajouter filtrage par organization_id

**Problème** : Actuellement, `req.user` ne contient pas d'`organization_id`.

**Solution 1** : Ajouter `organization_id` à l'utilisateur lors de l'authentification

```javascript
const authenticateToken = async (req, res, next) => {
  // ... vérification token

  const user = await User.findByPk(decoded.userId, {
    attributes: ['id', 'username', 'role', 'organization_id'], // ← Ajouter
  });

  if (!user || !user.is_active) {
    return res.status(401).json({ ... });
  }

  req.user = user;
  req.organizationId = user.organization_id; // ← Ajouter pour faciliter l'accès
  next();
};
```

**Solution 2** : Créer un middleware `injectOrganizationScope`

```javascript
const injectOrganizationScope = (req, res, next) => {
  if (req.user) {
    // Ajouter un scope Sequelize global pour filtrer par organization_id
    req.db = {
      ...models,
      Sale: models.Sale.scope({ where: { organization_id: req.user.organization_id } }),
      Product: models.Product.scope({ where: { organization_id: req.user.organization_id } }),
      // ... etc pour tous les modèles
    };
  }
  next();
};

// Utilisation
router.get('/sales', authenticateToken, injectOrganizationScope, saleController.getAllSales);
```

### 2. audit.js - Logger organization_id

**Problème** : `audit_logs` ne contient pas d'`organization_id`.

**Solution** : Ajouter `organization_id` dans le logging

```javascript
await AuditLog.log({
  userId: req.user.id,
  organizationId: req.user.organization_id, // ← Ajouter
  action,
  entityType,
  entityId,
  details,
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.get('user-agent'),
});
```

**Migration BDD requise** :
```sql
ALTER TABLE audit_logs ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
```

### 3. errorHandler.js

**Aucune modification requise** : Ce middleware ne dépend pas des données métier.

---

## Recommandations Sécurité

### 1. Implémenter un système de refresh token

**Problème** : Actuellement, le token expire et l'utilisateur doit se reconnecter.

**Solution** : Ajouter un refresh token stocké en BDD

```javascript
// Nouvelle table
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

// Nouveau endpoint
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  const tokenRecord = await RefreshToken.findOne({ where: { token: refreshToken } });

  if (!tokenRecord || tokenRecord.expires_at < new Date()) {
    return res.status(401).json({ error: 'Refresh token invalide' });
  }

  const newAccessToken = jwt.sign({ userId: tokenRecord.user_id }, config.jwt.secret, { expiresIn: '1h' });

  res.json({ accessToken: newAccessToken });
});
```

### 2. Implémenter une blacklist de tokens

**Problème** : Impossible de révoquer un token avant son expiration (ex: logout, changement de mot de passe).

**Solution** : Utiliser Redis pour stocker les tokens révoqués

```javascript
const redis = require('redis');
const client = redis.createClient();

// Lors du logout
router.post('/logout', authenticateToken, async (req, res) => {
  const token = req.headers['authorization'].split(' ')[1];

  // Stocker le token dans Redis jusqu'à son expiration
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  await client.setex(`blacklist:${token}`, expiresIn, '1');

  res.json({ success: true, message: 'Déconnecté' });
});

// Modifier authenticateToken pour vérifier la blacklist
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  // Vérifier si le token est blacklisté
  const isBlacklisted = await client.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token révoqué' });
  }

  // ... reste du code
};
```

### 3. Masquer les stack traces en production

**Problème** : Les stack traces peuvent révéler des infos sensibles sur l'architecture.

**Solution** : Conditionner l'affichage selon l'environnement

```javascript
const errorHandler = (err, req, res, next) => {
  logger.error('Erreur non gérée:', err);

  // ... gestion des erreurs spécifiques

  // Erreur par défaut
  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Une erreur est survenue',
    },
  };

  // Ajouter la stack uniquement en développement
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
};
```

### 4. Ajouter rate limiting sur les erreurs

**Problème** : Un attaquant peut déclencher volontairement des erreurs pour surcharger les logs.

**Solution** : Rate limiter les erreurs par IP

```javascript
const rateLimit = require('express-rate-limit');

const errorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 erreurs par minute
  message: { error: 'Trop d\'erreurs, veuillez réessayer plus tard' },
  skipSuccessfulRequests: true, // Ne compter que les erreurs
});

// Appliquer AVANT le errorHandler
app.use(errorLimiter);
app.use(errorHandler);
```

---

## Résumé statistique

| Métrique | Valeur |
|----------|--------|
| **Middlewares analysés** | 3 |
| **Lignes de code totales** | 332 |
| **Middlewares exportés** | 8 (5 auth + 2 errorHandler + 1 audit) |
| **Helpers exportés** | 1 (logAction) |
| **Bugs critiques** | 1 (requireAdmin sans vérification req.user) |
| **Warnings sécurité** | 4 |
| **Dépendances NPM** | 2 (jsonwebtoken, logger) |
| **Pattern Factory** | 3 (requirePermission, requireAnyPermission, auditMiddleware) |
| **Multi-tenant ready** | 0/3 (nécessite modifications) |
| **Incohérences de structure** | 1 (middleware/ vs middlewares/) |

---

**Fin de la documentation BACKEND_MIDDLEWARES.md**
