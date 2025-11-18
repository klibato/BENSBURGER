# 🧪 Test Production Locale - FlexPOS

Guide pour tester l'environnement de production en local sans configuration DNS.

## 📋 Prérequis

- Docker et Docker Compose installés
- Ports disponibles : 5432, 8080, 8081, 8082, 8083

## 🚀 Démarrage

### 1. Arrêter l'environnement de développement (si actif)

```bash
docker-compose down -v
```

### 2. Démarrer l'environnement de production local

```bash
docker-compose -f docker-compose.local.yml up -d --build
```

### 3. Vérifier que tous les services sont démarrés

```bash
docker-compose -f docker-compose.local.yml ps
```

Vous devriez voir 6 containers actifs :
- `flexpos_caddy_local` (healthy)
- `flexpos_postgres_local` (healthy)
- `flexpos_backend_local` (healthy)
- `flexpos_frontend_local` (healthy)
- `flexpos_landing_local` (healthy)
- `flexpos_admin_local` (healthy)

### 4. Vérifier les migrations

```bash
docker-compose -f docker-compose.local.yml logs backend | grep "migration"
```

Vous devriez voir : `✅ 12 migration(s) SQL appliquée(s) avec succès`

### 5. Charger les données de test (Ben's Burger)

```bash
docker-compose -f docker-compose.local.yml exec postgres psql -U postgres -d pos_burger -f /database/seeds/002_bensburger_complete.sql
```

### 6. Vérifier que les données sont chargées

```bash
docker-compose -f docker-compose.local.yml exec postgres psql -U postgres -d pos_burger -c "SELECT id, name, email FROM organizations;"
```

## 🌐 Accès aux Applications

Une fois tous les services démarrés :

| Service | URL | Description |
|---------|-----|-------------|
| **Landing Page** | http://localhost:8080 | Site vitrine FlexPOS |
| **Application POS** | http://localhost:8081 | Interface caisse (point de vente) |
| **Admin Dashboard** | http://localhost:8082 | Dashboard super-admin |
| **API Backend** | http://localhost:8083 | API REST (endpoints /api/*) |
| **PostgreSQL** | localhost:5432 | Base de données (accès direct) |

## 👤 Comptes de Test

### Organisation : Ben's Burger (ID: 2)

**Gérant (Admin)**
- Username: `patrick`
- PIN: `1234`
- Email: patrick@bensburger.fr

**Caissière**
- Username: `sophie`
- PIN: `5678`
- Email: sophie@bensburger.fr

**Caissier**
- Username: `lucas`
- PIN: `9012`
- Email: lucas@bensburger.fr

### Super-Admin FlexPOS (ID: 1)

**Super Admin**
- Username: `admin`
- Password: `admin123` (à changer en production)
- Email: admin@flexpos.app
- Accès: http://localhost:8082

## 🔍 Debug et Logs

### Voir tous les logs en temps réel

```bash
docker-compose -f docker-compose.local.yml logs -f
```

### Logs d'un service spécifique

```bash
# Backend
docker-compose -f docker-compose.local.yml logs -f backend

# Postgres
docker-compose -f docker-compose.local.yml logs -f postgres

# Caddy
docker-compose -f docker-compose.local.yml logs -f caddy
```

### Accéder à la base de données

```bash
docker-compose -f docker-compose.local.yml exec postgres psql -U postgres -d pos_burger
```

Commandes utiles PostgreSQL :
```sql
-- Lister toutes les tables
\dt

-- Voir structure d'une table
\d users
\d products
\d organizations

-- Compter les produits Ben's Burger
SELECT COUNT(*) FROM products WHERE organization_id = 2;

-- Voir tous les utilisateurs
SELECT id, username, role, first_name, last_name FROM users;

-- Quitter psql
\q
```

## 🛑 Arrêt

### Arrêter les services (garder les données)

```bash
docker-compose -f docker-compose.local.yml down
```

### Arrêter et supprimer toutes les données (reset complet)

```bash
docker-compose -f docker-compose.local.yml down -v
```

## 🐛 Résolution de Problèmes

### Erreur : Port déjà utilisé

Si un port (8080, 8081, etc.) est déjà utilisé :

1. Identifier le processus :
```bash
# Windows
netstat -ano | findstr :8080

# Linux/Mac
lsof -i :8080
```

2. Soit arrêter le processus, soit modifier les ports dans `docker-compose.local.yml`

### Erreur : Migrations échouent

Les migrations s'exécutent automatiquement au démarrage du backend. Si elles échouent :

1. Vérifier les logs backend :
```bash
docker-compose -f docker-compose.local.yml logs backend
```

2. Reset complet de la base :
```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d --build
```

### Container unhealthy

Vérifier les healthchecks :
```bash
docker-compose -f docker-compose.local.yml ps
docker inspect flexpos_backend_local | grep -A 20 Health
```

## 📊 Données de Test Incluses

Après avoir chargé le seed `002_bensburger_complete.sql` :

- **1 Organisation** : Ben's Burger (ID: 2)
- **3 Utilisateurs** : patrick (admin), sophie, lucas (cashiers)
- **31 Produits** :
  - 6 Burgers (Classic, Cheese, Bacon, Veggie, Big Ben, Chicken)
  - 6 Accompagnements (Frites, Nuggets, Onion Rings, Salad)
  - 9 Boissons (Coca, Sprite, Eau, Jus, Milkshakes)
  - 5 Desserts (Brownie, Cookie, Muffin, Donut, Tarte)
  - 5 Menus (Classic, Cheese, Bacon, Big Ben, Enfant)
- **1 Abonnement** : Plan Starter actif (29€/mois)

## 🔄 Workflow de Test Recommandé

1. **Landing Page** (http://localhost:8080)
   - Vérifier que le site vitrine s'affiche
   - Tester les liens vers l'inscription

2. **API Health** (http://localhost:8083/health)
   - Vérifier que l'API répond : `{"status": "ok"}`

3. **Application POS** (http://localhost:8081)
   - Se connecter avec `patrick` / PIN `1234`
   - Créer une vente test
   - Vérifier le catalogue produits (31 produits)

4. **Admin Dashboard** (http://localhost:8082)
   - Se connecter avec `admin` / `admin123`
   - Voir les organisations (FlexPOS + Ben's Burger)
   - Consulter les statistiques

5. **Tests API** (optionnel)
```bash
# Health check
curl http://localhost:8083/health

# Login (récupérer token)
curl -X POST http://localhost:8083/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"patrick","pinCode":"1234"}'

# Lister les produits (remplacer YOUR_TOKEN)
curl http://localhost:8083/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Notes

- **Environnement de test uniquement** : Ne jamais utiliser ces configurations en production réelle
- **Pas de SSL** : Les connexions sont en HTTP (pas HTTPS) pour simplifier le test local
- **Données persistantes** : Les données restent entre les redémarrages sauf si vous utilisez `down -v`
- **JWT Secret** : Utilise une valeur par défaut (à changer en prod)

## ✅ Checklist de Validation

Avant de déployer sur un vrai serveur, vérifier :

- [ ] Tous les containers démarrent correctement
- [ ] Les 12 migrations s'exécutent sans erreur
- [ ] Le seed Ben's Burger se charge sans erreur
- [ ] L'API répond sur /health
- [ ] Le login fonctionne (patrick/1234)
- [ ] Les produits s'affichent dans l'app POS
- [ ] Le dashboard admin est accessible
- [ ] Les logs ne montrent pas d'erreurs critiques

## 🚀 Prochaine Étape

Une fois les tests locaux validés, vous pouvez déployer sur un vrai serveur avec :
- Nom de domaine configuré (DNS A records)
- SSL automatique via Let's Encrypt (Caddy)
- Variables d'environnement de production (JWT_SECRET, etc.)
- Utiliser `docker-compose.prod.yml` au lieu de `docker-compose.local.yml`
