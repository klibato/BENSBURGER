# PHASE 1 - TRAVAIL RESTANT

**Date**: 2025-11-16
**Statut**: 🟡 PHASE 1 en cours - 60% complété

---

## ✅ COMPLÉTÉ

### PHASE 1.A - Database & Models (100%)
- ✅ Migration 014: Table organizations
- ✅ Migration 015: organization_id sur 7 tables
- ✅ Modèle Organization.js
- ✅ 7 modèles mis à jour (User, Product, Sale, etc.)
- ✅ Middleware tenantIsolation.js
- ✅ Associations Organization <-> All models

### PHASE 1.B - Controllers (30%)
- ✅ authController.js (organization_id in JWT)
- ✅ productController.js (5 methods)
- ✅ userController.js (5 methods)
- ⏳ 7 contrôleurs restants (voir ci-dessous)

---

## 🔄 EN COURS - Contrôleurs Restants (7/10)

### Pattern Multi-Tenant À Appliquer

**Pour TOUTES les requêtes Sequelize**:

#### 1. FindAll / FindOne
```javascript
// AVANT
const items = await Model.findAll({
  where: { is_active: true },
});

// APRÈS
const items = await Model.findAll({
  where: {
    organization_id: req.organizationId, // MULTI-TENANT
    is_active: true,
  },
});
```

#### 2. FindByPk
```javascript
// AVANT
const item = await Model.findByPk(id);

// APRÈS
const item = await Model.findOne({
  where: {
    id,
    organization_id: req.organizationId, // MULTI-TENANT
  },
});
```

#### 3. Create
```javascript
// AVANT
const item = await Model.create({
  name: 'test',
  value: 123,
});

// APRÈS
const item = await Model.create({
  organization_id: req.organizationId, // MULTI-TENANT
  name: 'test',
  value: 123,
});
```

#### 4. Update
```javascript
// AVANT
const item = await Model.findByPk(id);
await item.update(updates);

// APRÈS
// Empêcher modification de organization_id
delete updates.organization_id;

const item = await Model.findOne({
  where: {
    id,
    organization_id: req.organizationId, // MULTI-TENANT
  },
});

if (!item) {
  return res.status(404).json({ error: 'Not found' });
}

await item.update(updates);
```

#### 5. Delete
```javascript
// AVANT
const item = await Model.findByPk(id);
await item.destroy();

// APRÈS
const item = await Model.findOne({
  where: {
    id,
    organization_id: req.organizationId, // MULTI-TENANT
  },
});

if (!item) {
  return res.status(404).json({ error: 'Not found' });
}

await item.destroy();
```

#### 6. AuditLog.log() calls
```javascript
// AVANT
await AuditLog.log({
  userId: req.user.id,
  action: 'CREATE',
  entityType: 'sale',
  entityId: sale.id,
});

// APRÈS
await AuditLog.log({
  organizationId: req.organizationId, // MULTI-TENANT (REQUIS)
  userId: req.user.id,
  action: 'CREATE',
  entityType: 'sale',
  entityId: sale.id,
});
```

---

## 📋 LISTE DES CONTRÔLEURS À METTRE À JOUR

### 1. saleController.js (PRIORITÉ HAUTE)

**Fichier**: `backend/src/controllers/saleController.js` (683 lignes)

**Méthodes à mettre à jour**:

```javascript
// createSale (ligne ~18)
const activeCashRegister = await CashRegister.findOne({
  where: {
    opened_by: req.user.id,
    status: 'open',
    organization_id: req.organizationId, // AJOUTER
  },
});

// createSale (ligne ~181)
const sale = await Sale.create({
  organization_id: req.organizationId, // AJOUTER
  ticket_number: '', // généré par trigger
  user_id: req.user.id,
  // ... autres champs
});

// createSale - Sale items (ligne ~207)
const saleItemsData = await Promise.all(
  items.map(async (item) => {
    const product = await Product.findOne({ // MODIFIER findByPk
      where: {
        id: item.product_id,
        organization_id: req.organizationId, // AJOUTER
      },
      transaction,
    });

    return {
      organization_id: req.organizationId, // AJOUTER
      sale_id: sale.id,
      product_id: item.product_id,
      // ... autres champs
    };
  })
);

// getAllSales (ligne ~330)
const sales = await Sale.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTER
    // ... autres filtres
  },
  // ...
});

// getSaleById (ligne ~411)
const sale = await Sale.findOne({ // MODIFIER findByPk
  where: {
    id,
    organization_id: req.organizationId, // AJOUTER
  },
  // ...
});

// cancelSale (ligne ~458)
const sale = await Sale.findOne({ // MODIFIER findByPk
  where: {
    id,
    organization_id: req.organizationId, // AJOUTER
  },
});

// printReceipt (ligne ~498)
// settings est global, pas de organization_id
// Mais devrait utiliser req.organization.settings à terme

// getRevenue (ligne ~571)
const sales = await Sale.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTER
    // ... autres filtres
  },
});
```

**AuditLog calls**: Ajouter `organizationId: req.organizationId` dans tous les appels.

---

### 2. cashRegisterController.js (PRIORITÉ HAUTE)

**Fichier**: `backend/src/controllers/cashRegisterController.js` (580 lignes)

**Méthodes à mettre à jour**:

```javascript
// openCashRegister (ligne ~20)
const existingOpen = await CashRegister.findOne({
  where: {
    opened_by: req.user.id,
    status: 'open',
    organization_id: req.organizationId, // AJOUTER
  },
});

// openCashRegister (ligne ~30)
const cashRegister = await CashRegister.create({
  organization_id: req.organizationId, // AJOUTER
  register_name: `Caisse ${req.user.first_name}`,
  opened_by: req.user.id,
  // ... autres champs
});

// getOpenCashRegister (ligne ~60)
const cashRegister = await CashRegister.findOne({
  where: {
    opened_by: req.user.id,
    status: 'open',
    organization_id: req.organizationId, // AJOUTER
  },
});

// closeCashRegister (ligne ~90)
const cashRegister = await CashRegister.findOne({ // MODIFIER findByPk
  where: {
    id,
    organization_id: req.organizationId, // AJOUTER
  },
});

// Calcul totaux (ligne ~120)
const sales = await Sale.findAll({
  where: {
    cash_register_id: id,
    status: 'completed',
    organization_id: req.organizationId, // AJOUTER
  },
});

// getAllCashRegisters (ligne ~350)
const cashRegisters = await CashRegister.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTER
    // ... autres filtres
  },
});

// getCashRegisterById (ligne ~400)
const cashRegister = await CashRegister.findOne({ // MODIFIER findByPk
  where: {
    id,
    organization_id: req.organizationId, // AJOUTER
  },
});
```

**AuditLog calls**: Ajouter `organizationId: req.organizationId`.

---

### 3. dashboardController.js (PRIORITÉ MOYENNE)

**Fichier**: `backend/src/controllers/dashboardController.js`

**Principe**: Filtrer TOUTES les stats par `organization_id`

```javascript
// Ventes du jour
const todaySales = await Sale.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTER
    created_at: { [Op.gte]: startOfDay },
    status: 'completed',
  },
});

// Produits low stock
const lowStockProducts = await Product.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTER
    quantity: { [Op.lte]: sequelize.col('low_stock_threshold') },
  },
});

// Utilisateurs actifs
const activeUsers = await User.count({
  where: {
    organization_id: req.organizationId, // AJOUTER
    is_active: true,
  },
});
```

---

### 4. settingsController.js (PRIORITÉ BASSE)

**Fichier**: `backend/src/controllers/settingsController.js`

**Note**: `StoreSettings` va probablement être supprimé ou transformé.

**Approche temporaire**: Utiliser `req.organization.settings` au lieu de StoreSettings.

```javascript
// getSettings
const settings = req.organization.settings; // Utiliser organization

// updateSettings
await req.organization.update({
  settings: { ...req.organization.settings, ...updates },
});
```

---

### 5. printerController.js (PRIORITÉ BASSE)

**Fichier**: `backend/src/controllers/printerController.js`

```javascript
// testPrint (ligne ~20)
const sale = await Sale.findOne({ // MODIFIER findByPk si sale_id fourni
  where: {
    id: sale_id,
    organization_id: req.organizationId, // AJOUTER
  },
});

// Utiliser printer_config depuis organization
const printerConfig = req.organization.settings.printer_config || {};
```

---

### 6. sumupController.js (PRIORITÉ BASSE)

**Fichier**: `backend/src/controllers/sumupController.js`

```javascript
// Utiliser sumup_config depuis organization
const sumupConfig = req.organization.settings.sumup_config || {};

// Lors de la création de ventes SumUp
const sale = await Sale.create({
  organization_id: req.organizationId, // AJOUTER
  // ...
});
```

---

### 7. logsController.js (PRIORITÉ MOYENNE)

**Fichier**: `backend/src/controllers/logsController.js`

```javascript
// getAllLogs
const logs = await AuditLog.findAll({
  where: {
    organization_id: req.organizationId, // AJOUTER
    // ... autres filtres
  },
});

// getLogById
const log = await AuditLog.findOne({ // MODIFIER findByPk
  where: {
    id,
    organization_id: req.organizationId, // AJOUTER
  },
});
```

---

## 🧪 TESTS À EFFECTUER (AVANT PHASE 1.C)

Avant de continuer, il faut **tester** ce qui a été fait:

### 1. Tester les migrations

```bash
# Rebuild complet
docker-compose down -v
docker-compose up -d --build

# Vérifier les logs
docker-compose logs backend | grep -i migration

# Vérifier les tables
docker exec -it pos_postgres psql -U postgres -d pos_burger -c "\d organizations"
docker exec -it pos_postgres psql -U postgres -d pos_burger -c "\d users"
docker exec -it pos_postgres psql -U postgres -d pos_burger -c "\d products"

# Vérifier les données
docker exec -it pos_postgres psql -U postgres -d pos_burger -c "SELECT id, name, slug FROM organizations;"
docker exec -it pos_postgres psql -U postgres -d pos_burger -c "SELECT id, username, organization_id FROM users;"
```

**Résultat attendu**:
- ✅ Table `organizations` créée avec 1 row (BensBurger)
- ✅ Toutes les tables ont la colonne `organization_id`
- ✅ Toutes les données existantes ont `organization_id = 1`
- ✅ Migrations 014 et 015 dans `migrations_history`

### 2. Tester le login (authController)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "pin_code": "1234"}'
```

**Résultat attendu**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "username": "admin",
      "organization_id": 1  // ← IMPORTANT
    }
  }
}
```

**Vérifier le token JWT** (sur jwt.io):
- Payload doit contenir: `{"userId": 1, "username": "admin", "role": "admin", "organization_id": 1}`

### 3. Tester les produits (productController)

```bash
# Get all products (doit filtrer par organization_id)
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>"

# Créer un produit
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price_ht": 5.00,
    "vat_rate": 10.0,
    "category": "burgers"
  }'
```

**Résultat attendu**:
- ✅ Produit créé avec `organization_id: 1`
- ✅ GET /products retourne uniquement les produits de l'org 1

### 4. Tester les users (userController)

```bash
# Créer un user
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "pin_code": "9999",
    "first_name": "Test",
    "last_name": "User",
    "role": "cashier"
  }'

# Get all users
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

**Résultat attendu**:
- ✅ User créé avec `organization_id: 1`
- ✅ GET /users retourne uniquement les users de l'org 1

---

## 🚀 PROCHAINES ÉTAPES

### Option A: Tester maintenant (RECOMMANDÉ)
1. Commit + push le code actuel
2. Rebuild Docker (`docker-compose down -v && docker-compose up -d --build`)
3. Tester migrations (voir ci-dessus)
4. Tester les 3 contrôleurs (auth, product, user)
5. Vérifier 0 erreur dans les logs
6. Si OK → Continuer avec les 7 contrôleurs restants

### Option B: Continuer l'implémentation
1. Mettre à jour saleController.js
2. Mettre à jour cashRegisterController.js
3. Mettre à jour les 5 autres
4. PUIS tester tout d'un coup

**Recommandation**: **Option A** - Tester maintenant pour valider l'architecture avant de continuer.

---

## 📊 PROGRESSION PHASE 1

| Tâche | Statut | Complété |
|-------|--------|----------|
| **PHASE 1.A - Database** | ✅ Terminé | 100% |
| Migrations 014 + 015 | ✅ | ✅ |
| Modèle Organization | ✅ | ✅ |
| Modèles mis à jour (7) | ✅ | ✅ |
| Middleware tenantIsolation | ✅ | ✅ |
| **PHASE 1.B - Controllers** | 🟡 En cours | 30% |
| authController | ✅ | ✅ |
| productController | ✅ | ✅ |
| userController | ✅ | ✅ |
| saleController | ⏳ | ❌ |
| cashRegisterController | ⏳ | ❌ |
| dashboardController | ⏳ | ❌ |
| settingsController | ⏳ | ❌ |
| printerController | ⏳ | ❌ |
| sumupController | ⏳ | ❌ |
| logsController | ⏳ | ❌ |
| **PHASE 1.C - Routes** | ⏳ | 0% |
| Ajouter tenantIsolation middleware | ⏳ | ❌ |
| Create organizationController | ⏳ | ❌ |
| Create organizationRoutes | ⏳ | ❌ |
| **PHASE 1.D - Tests** | ⏳ | 0% |
| Tests isolation multi-tenant | ⏳ | ❌ |
| Tests création organisations | ⏳ | ❌ |

**Total PHASE 1**: 🟡 **45% complété**

---

**Document créé le**: 2025-11-16
**Dernière mise à jour**: 2025-11-16
