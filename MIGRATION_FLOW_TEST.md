# 🔄 Flow d'Exécution des Migrations - Test de Vérification

## Ordre d'Exécution lors d'un Build Complet

### 1️⃣ **PostgreSQL Démarre** (Container `pos_postgres`)

```bash
# Docker exécute automatiquement
/docker-entrypoint-initdb.d/init.sql
```

**Ce qui se passe** :
- ✅ Tables créées : `users`, `products`, `sales`, `cash_registers`, etc.
- ✅ Index créés
- ✅ Triggers créés (génération ticket_number, updated_at)
- ⚠️  **ATTENTION** : Les colonnes `quantity`, `low_stock_threshold` NE SONT PAS créées (ajoutées plus tard par migration 010)

**Fichier source** : `database/init.sql` (ligne 14 dans docker-compose.yml)

---

### 2️⃣ **Backend Démarre** (Container `pos_backend`)

Attend que PostgreSQL soit healthy, puis exécute :

```bash
npm run dev
# → nodemon src/server.js
# → startServer()
# → migrateAllSQL()
```

**Ce qui se passe** (`backend/src/scripts/migrateAllSQL.js`) :

1. **Crée `migrations_history`** si elle n'existe pas
   ```sql
   CREATE TABLE IF NOT EXISTS migrations_history (
     id SERIAL PRIMARY KEY,
     migration_name VARCHAR(255) NOT NULL UNIQUE,
     executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Lit `database/migrations/`** et trouve :
   - `001_update_cash_registers.sql`
   - `008_create_store_settings.sql`
   - `009_add_display_order_image_to_products.sql`
   - `010_add_stock_fields_to_products.sql` ⭐
   - `011_update_audit_logs_actions.sql` ⭐

3. **Vérifie `migrations_history`** pour voir lesquelles ont déjà été exécutées

4. **Exécute SEULEMENT les nouvelles migrations** dans l'ordre alphabétique

5. **Enregistre chaque migration** dans `migrations_history`

**Logs attendus** :
```
🔄 5 migration(s) SQL à exécuter:
  📝 Exécution: 001_update_cash_registers.sql
  ✅ Migration 001_update_cash_registers.sql appliquée avec succès
  📝 Exécution: 008_create_store_settings.sql
  ✅ Migration 008_create_store_settings.sql appliquée avec succès
  📝 Exécution: 009_add_display_order_image_to_products.sql
  ✅ Migration 009_add_display_order_image_to_products.sql appliquée avec succès
  📝 Exécution: 010_add_stock_fields_to_products.sql
  ✅ Migration 010_add_stock_fields_to_products.sql appliquée avec succès
  📝 Exécution: 011_update_audit_logs_actions.sql
  ✅ Migration 011_update_audit_logs_actions.sql appliquée avec succès
✅ 5 migration(s) SQL appliquée(s) avec succès
```

---

### 3️⃣ **Seeds** (Optionnel - Manuel)

```bash
cd backend
npm run db:seed
```

**Ce qui se passe** :
- Insère 3 utilisateurs (admin, john, marie)
- Insère 15 produits (burgers, sides, drinks, desserts)

---

## 🧪 Test du Flow Complet

### Scénario : Fresh Install (Base Vide)

```bash
# 1. Supprimer les conteneurs ET les volumes
docker-compose down -v

# 2. Vérifier que le volume PostgreSQL est bien supprimé
docker volume ls | grep pos

# 3. Redémarrer tout
docker-compose up -d

# 4. Vérifier les logs PostgreSQL
docker-compose logs postgres | grep "CREATE TABLE"
# Devrait afficher toutes les tables de init.sql

# 5. Vérifier les logs du backend
docker-compose logs backend | grep "migration"
# Devrait afficher les 5 migrations exécutées

# 6. Vérifier la table migrations_history
docker exec -it pos_postgres psql -U postgres -d pos_burger \
  -c "SELECT * FROM migrations_history ORDER BY executed_at;"

# Résultat attendu :
# id | migration_name                              | executed_at
# ---+---------------------------------------------+-------------------
#  1 | 001_update_cash_registers.sql               | 2025-11-16 03:00:00
#  2 | 008_create_store_settings.sql               | 2025-11-16 03:00:01
#  3 | 009_add_display_order_image_to_products.sql | 2025-11-16 03:00:02
#  4 | 010_add_stock_fields_to_products.sql        | 2025-11-16 03:00:03
#  5 | 011_update_audit_logs_actions.sql           | 2025-11-16 03:00:04

# 7. Vérifier que les colonnes stock existent
docker exec -it pos_postgres psql -U postgres -d pos_burger \
  -c "\d products" | grep -E "quantity|low_stock"

# Résultat attendu :
# quantity            | integer    | not null | default 0
# low_stock_threshold | integer    | not null | default 10

# 8. Seed les données de test
docker-compose exec backend npm run db:seed

# 9. Tester l'API
curl http://localhost:3000/api/products
# Devrait retourner 15 produits avec quantity=0
```

---

## 🔁 Test du Redémarrage (Base Existante)

```bash
# 1. Redémarrer le backend
docker-compose restart backend

# 2. Vérifier les logs
docker-compose logs backend | grep "migration"

# Résultat attendu :
# ✅ Toutes les migrations SQL sont à jour

# 3. Vérifier qu'aucune migration n'a été ré-exécutée
docker exec -it pos_postgres psql -U postgres -d pos_burger \
  -c "SELECT migration_name, COUNT(*) FROM migrations_history GROUP BY migration_name;"

# Résultat attendu : Chaque migration apparaît 1 SEULE fois
```

---

## ✅ Checklist de Vérification

### Init.sql s'exécute bien ?
- [ ] Tables créées : `SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';` → Devrait retourner 8
- [ ] Triggers créés : `SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_%';` → Devrait retourner 3+

### Migrations SQL s'exécutent bien ?
- [ ] Table `migrations_history` existe : `\dt migrations_history`
- [ ] 5 migrations enregistrées : `SELECT COUNT(*) FROM migrations_history;` → Devrait retourner 5
- [ ] Colonnes stock ajoutées : `\d products` → Contient `quantity` et `low_stock_threshold`
- [ ] Contrainte audit_logs étendue : Insertion de `OPEN_REGISTER` fonctionne

### Seeds fonctionnent bien ?
- [ ] 3 utilisateurs : `SELECT COUNT(*) FROM users;` → Devrait retourner 3
- [ ] 15 produits : `SELECT COUNT(*) FROM products;` → Devrait retourner 15

---

## 🐛 Troubleshooting

### Erreur : "column quantity does not exist"
**Cause** : Migration 010 n'a pas été exécutée
**Solution** :
```bash
docker-compose restart backend
docker-compose logs backend | grep "010_add_stock"
```

### Erreur : "relation migrations_history already exists"
**Cause** : Normal, la table existe déjà
**Solution** : Aucune, c'est idempotent (IF NOT EXISTS)

### Les migrations ne s'exécutent pas
**Cause** : Dossier `database/migrations` introuvable
**Solution** :
```bash
# Vérifier le chemin dans le container
docker-compose exec backend ls -la /app/../database/migrations
```

### Réinitialiser complètement
```bash
docker-compose down -v
docker-compose up -d
cd backend && npm run db:seed
```

---

## 📝 Résumé du Flow

```
┌─────────────────────────────────────────────────────────────┐
│ docker-compose up -d                                        │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
    ┌──────────┐                     ┌───────────┐
    │PostgreSQL│                     │  Backend  │
    └──────────┘                     └───────────┘
          │                                 │
          │ 1. Exécute init.sql            │ 2. Attend healthcheck
          │    (docker-entrypoint)          │
          ▼                                 ▼
    [Tables créées]                   [npm run dev]
    - users                                 │
    - products (sans stock)                 │
    - sales                                 ▼
    - cash_registers              [server.js startServer()]
    - etc.                                  │
          │                                 ▼
          │                        [migrateAllSQL()]
          │                                 │
          │◄────────────────────────────────┤
          │                                 │
          │ 3. Crée migrations_history      │
          │ 4. Exécute 001, 008, 009, 010, 011
          │ 5. Enregistre dans history      │
          │                                 │
          ▼                                 ▼
    [Base complète]                   [API Ready]
    - Toutes colonnes                  🚀 Port 3000
    - Toutes contraintes
    - Historique migrations
```

---

**🎯 Conclusion** : Tout s'exécute automatiquement dans le bon ordre !
