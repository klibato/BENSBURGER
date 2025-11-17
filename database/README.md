# Base de Données - Migrations SQL

## Structure

```
database/
├── init.sql              # Schéma initial de la base de données
├── seeds.sql             # Données de test (produits, utilisateurs de démo)
├── migrations/           # Migrations SQL (exécutées automatiquement au démarrage)
│   ├── 001_update_cash_registers.sql
│   ├── 008_create_store_settings.sql
│   ├── 009_add_display_order_image_to_products.sql
│   ├── 010_add_stock_fields_to_products.sql
│   └── 011_update_audit_logs_actions.sql
└── README.md             # Ce fichier
```

## Migrations Automatiques

Les migrations SQL sont **exécutées automatiquement** au démarrage du serveur backend.

Le script `backend/src/scripts/migrateAllSQL.js` :
- ✅ Lit tous les fichiers `.sql` dans `database/migrations/`
- ✅ Vérifie quelles migrations ont déjà été appliquées (table `migrations_history`)
- ✅ Exécute uniquement les nouvelles migrations dans l'ordre alphabétique
- ✅ Enregistre chaque migration exécutée dans `migrations_history`

### Utilisation

**Démarrage normal** (les migrations s'exécutent automatiquement) :
```bash
cd backend
npm run dev
```

**Exécuter manuellement toutes les migrations** :
```bash
cd backend
node src/scripts/migrateAllSQL.js
```

**Exécuter une migration SQL spécifique** :
```bash
docker exec -i pos_postgres psql -U postgres -d pos_burger < database/migrations/010_add_stock_fields_to_products.sql
```

## Créer une Nouvelle Migration

1. **Créer un fichier SQL** dans `database/migrations/` avec un nom numéroté :
   ```bash
   database/migrations/012_nom_de_la_migration.sql
   ```

2. **Écrire la migration** avec des commandes idempotentes (IF NOT EXISTS, etc.) :
   ```sql
   -- Migration: Description de la migration
   -- Date: 2025-11-16

   ALTER TABLE ma_table
   ADD COLUMN IF NOT EXISTS nouvelle_colonne VARCHAR(255);

   CREATE INDEX IF NOT EXISTS idx_ma_table_nouvelle_colonne
   ON ma_table(nouvelle_colonne);
   ```

3. **Redémarrer le backend** → La migration s'exécutera automatiquement !

## Historique des Migrations

La table `migrations_history` enregistre toutes les migrations exécutées :

```sql
-- Voir les migrations appliquées
SELECT * FROM migrations_history ORDER BY executed_at DESC;

-- Vérifier si une migration a été appliquée
SELECT EXISTS (
  SELECT 1 FROM migrations_history
  WHERE migration_name = '010_add_stock_fields_to_products.sql'
);
```

## Liste des Migrations

| Numéro | Fichier | Description |
|--------|---------|-------------|
| 001 | `001_update_cash_registers.sql` | Amélioration de la table cash_registers (renommage colonnes, ajout opened_by/closed_by) |
| 008 | `008_create_store_settings.sql` | Création de la table store_settings (paramètres du commerce) |
| 009 | `009_add_display_order_image_to_products.sql` | Ajout de display_order et image_url aux produits |
| 010 | `010_add_stock_fields_to_products.sql` | Ajout de quantity et low_stock_threshold pour la gestion du stock |
| 011 | `011_update_audit_logs_actions.sql` | Extension de la contrainte CHECK audit_logs.action (OPEN_REGISTER, CLOSE_REGISTER, etc.) |

## Fichiers Spéciaux

### `init.sql`
Schéma de base de données initial exécuté lors de la première création du conteneur PostgreSQL.
Contient toutes les tables principales : users, products, sales, cash_registers, etc.

### `seeds.sql`
Données de démonstration :
- 3 utilisateurs (admin/1234, john/5678, marie/9999)
- 15 produits (burgers, sides, drinks, desserts, menus)

**Exécuter les seeds** :
```bash
cd backend
npm run db:seed
```

## Commandes NPM

```bash
# Démarrer le serveur (migrations auto)
npm run dev

# Seed de la base (utilisateurs + produits)
npm run db:seed

# Seed uniquement les utilisateurs
npm run db:seed-users
```

## Troubleshooting

### Erreur "relation already exists"
Les migrations utilisent `IF NOT EXISTS` pour être idempotentes. Si vous voyez cette erreur, c'est normal.

### Réinitialiser complètement la base de données
```bash
# Arrêter et supprimer les conteneurs
docker-compose down -v

# Redémarrer (init.sql sera ré-exécuté)
docker-compose up -d

# Re-seed les données
cd backend
npm run db:seed
```

### Forcer la ré-exécution d'une migration
```bash
# Supprimer l'entrée de migrations_history
docker exec -it pos_postgres psql -U postgres -d pos_burger
DELETE FROM migrations_history WHERE migration_name = '010_add_stock_fields_to_products.sql';
```

## Architecture Multi-Tenant (PHASE 1)

Les futures migrations pour le multi-tenant ajouteront :
- Table `organizations` (tenants)
- Colonne `organization_id` sur toutes les tables
- Middleware de tenant isolation
- RLS (Row Level Security) PostgreSQL

## NF525 Compliance (PHASE 2)

Les futures migrations pour NF525 ajouteront :
- Colonne `hash_chain` sur `sales` (chaînage SHA-256)
- Table `nf525_certificates` (certificats de signature)
- Trigger de génération de hash automatique
- Archivage immuable des tickets
