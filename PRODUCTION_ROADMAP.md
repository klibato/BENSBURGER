# 🚀 FLEXPOS - PRODUCTION ROADMAP
## Transformation SaaS Multi-Tenant Complète

**Date** : 2025-11-18
**Objectif** : Transformer FlexPOS en plateforme SaaS production-ready pour Ben's Burger

---

## ✅ PHASE 1 : AUDIT & NETTOYAGE - **TERMINÉ**

### Résultats
- ✅ Audit complet codebase existante
- ✅ Nettoyage dossier `backend/src/middleware` obsolète
- ✅ Mise à jour imports vers `middlewares/audit.js`
- ✅ Vérification dépendances (pas d'obsolètes critiques)

---

## ✅ PHASE 2 : BACKEND SAAS - **TERMINÉ**

### 1. Migrations SQL (3 fichiers)
- ✅ `database/migrations/017_create_subscriptions.sql`
  - Table `subscriptions` : Historique abonnements (plans, prix, périodes)
  - Prix en centimes (2900 = 29€)
  - Statuts : active, cancelled, past_due, trialing, expired
  - Intégration Stripe prête (stripe_subscription_id, stripe_customer_id)

- ✅ `database/migrations/018_create_invoices.sql`
  - Table `invoices` : Facturation mensuelle
  - Numérotation séquentielle (INV-2025-00001)
  - Calculs TVA 20% automatiques
  - Fonction SQL `generate_invoice_number()`
  - Statuts : draft, open, paid, void, uncollectible

- ✅ `database/migrations/019_create_admin_users.sql`
  - Table `admin_users` : Super-administrateurs séparés
  - Authentification email + password (bcrypt)
  - Rôles : super_admin, admin, support
  - Permissions JSONB granulaires
  - Admin par défaut : `admin@flexpos.app` / `Admin@2025`

### 2. Models Sequelize (3 fichiers)
- ✅ `backend/src/models/Subscription.js`
  - Méthodes : `isActive()`, `isTrialing()`, `isExpired()`, `getDaysRemaining()`
  - Statiques : `getPlanPrice()`, `getPlanLimits()`
  - Plans : free (0€), starter (29€), premium (49€), enterprise (99€)

- ✅ `backend/src/models/Invoice.js`
  - Méthodes : `isPaid()`, `isOverdue()`, `markAsPaid()`, `markAsVoid()`
  - Statiques : `calculateAmounts()`, `createFromSubscription()`
  - Formatage euros automatique

- ✅ `backend/src/models/AdminUser.js`
  - Méthodes : `verifyPassword()`, `hasPermission()`, `generateResetToken()`
  - Hooks : Hash automatique bcrypt (10 rounds)
  - Sécurité : email_verified, 2FA prêt

- ✅ `backend/src/models/index.js` : Relations SaaS ajoutées

### 3. Controllers Admin (3 fichiers)
- ✅ `backend/src/controllers/admin/adminAuthController.js`
  - `POST /api/admin/auth/login` : Connexion super-admin
  - `POST /api/admin/auth/logout` : Déconnexion
  - `GET /api/admin/auth/me` : Admin connecté
  - `POST /api/admin/auth/password-reset` : Réinitialisation

- ✅ `backend/src/controllers/admin/adminOrganizationsController.js`
  - `GET /api/admin/organizations` : Liste + stats (users, products, sales)
  - `GET /api/admin/organizations/:id` : Détails organisation
  - `PUT /api/admin/organizations/:id/suspend` : Suspendre
  - `PUT /api/admin/organizations/:id/activate` : Activer

- ✅ `backend/src/controllers/admin/adminAnalyticsController.js`
  - `GET /api/admin/analytics/dashboard` : Dashboard global
  - Métriques : Total orgs, MRR, ARR, revenus mois, churn

### 4. Middleware & Routes
- ✅ `backend/src/middlewares/adminAuth.js`
  - `authenticateAdmin` : JWT validation (type: admin)
  - `requireAdminPermission(permission)` : Vérification granulaire
  - `requireSuperAdmin` : Accès super_admin uniquement

- ✅ `backend/src/routes/admin.js` : Toutes les routes admin montées

- ✅ `backend/src/server.js` : Routes `/api/admin` intégrées

### 5. Services SaaS (2 fichiers)
- ✅ `backend/src/services/emailService.js`
  - Intégration Brevo (300 emails/jour gratuit)
  - `sendWelcomeEmail(org)` : Email bienvenue + login
  - `sendTrialEndingEmail(org, daysLeft)` : Rappel fin trial
  - Configuration : BREVO_API_KEY, FROM_EMAIL, FROM_NAME

- ✅ `backend/src/services/cronJobs.js`
  - **Cron 1** : Check trials expiring (9h daily)
    - Envoie email 3 jours avant expiration
  - **Cron 2** : Generate monthly invoices (1er du mois 00h)
    - Crée factures pour abonnements actifs
    - Mise à jour période d'abonnement
  - Démarrage auto en production

### 6. Configuration
- ✅ `backend/package.json` : Dépendance `node-cron` ajoutée
- ✅ `.env.example` : Variables BREVO, SENTRY ajoutées

---

## 🔲 PHASE 3 : SITE VITRINE (Landing Page)

### Objectif
Créer **frontend-landing/** : Application React pour www.flexpos.app

### Structure à créer
```
frontend-landing/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Hero.jsx
│   │   ├── Features.jsx
│   │   ├── Pricing.jsx
│   │   └── Testimonials.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── FeaturesPage.jsx
│   │   ├── PricingPage.jsx
│   │   ├── SignupPage.jsx (Formulaire inscription)
│   │   └── SignupSuccessPage.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css (TailwindCSS)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile
```

### Pages clés
1. **HomePage** :
   - Hero : "Caisse enregistreuse moderne pour restaurateurs"
   - Features : NF525, Multi-caisses, Analytics
   - CTA : "Essai gratuit 14 jours"

2. **PricingPage** :
   - Plan Free : 0€ (3 users, 50 produits)
   - Plan Starter : 29€/mois (10 users, 200 produits)
   - Plan Premium : 49€/mois (50 users, 1000 produits) ⭐ Populaire
   - Plan Enterprise : 99€/mois (999 users, 9999 produits)

3. **SignupPage** :
   - Formulaire : nom restaurant, email, téléphone
   - Création organisation + compte admin
   - Envoi email bienvenue
   - Redirection app.flexpos.app avec lien login

### Backend : Route inscription publique
- `POST /api/public/signup`
  - Validation : email unique, nom organisation
  - Création : Organization (status=trialing, trial_ends_at=+14 jours)
  - Création : User admin pour cette org
  - Création : Subscription (status=trialing)
  - Envoi : Email bienvenue avec credentials
  - Retour : `{ success: true, organization_id, login_url }`

### Commandes
```bash
# Créer app Vite
npm create vite@latest frontend-landing -- --template react
cd frontend-landing
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 🔲 PHASE 4 : DASHBOARD SUPER-ADMIN

### Objectif
Créer **frontend-admin/** : Application React pour admin.flexpos.app

### Structure à créer
```
frontend-admin/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── StatsCard.jsx
│   │   └── OrganizationCard.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx (Admin auth)
│   │   ├── DashboardPage.jsx (Analytics)
│   │   ├── OrganizationsPage.jsx (Liste + stats)
│   │   ├── OrganizationDetailPage.jsx
│   │   ├── SubscriptionsPage.jsx
│   │   ├── InvoicesPage.jsx
│   │   └── SettingsPage.jsx
│   ├── context/
│   │   └── AdminAuthContext.jsx
│   ├── services/
│   │   └── adminApi.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── Dockerfile
```

### Pages clés
1. **LoginPage** :
   - Email/username + password
   - Appel `POST /api/admin/auth/login`
   - Stockage token + redirect

2. **DashboardPage** :
   - KPIs : Total orgs, Active orgs, MRR, ARR
   - Graphique évolution revenus
   - Nouvelles inscriptions (30 derniers jours)
   - Churn rate

3. **OrganizationsPage** :
   - Table : Nom, Plan, Status, Users, Sales, Date création
   - Filtres : status, plan, search
   - Actions : Voir détails, Suspendre, Activer

4. **OrganizationDetailPage** :
   - Infos : nom, email, plan, limites
   - Liste users
   - Liste subscriptions
   - Stats : Total ventes, CA, Produits
   - Actions : Edit plan, Suspend, Delete

### Authentification
- Context AdminAuthContext :
  - `login(identifier, password)`
  - `logout()`
  - `adminUser` (state global)
  - `loading`, `error`

---

## 🔲 PHASE 5 : SEED BEN'S BURGER

### Objectif
Créer données de test réalistes pour Ben's Burger

### Fichier à créer
`database/seeds/002_bensburger_complete.sql`

### Contenu
```sql
-- Organisation Ben's Burger
INSERT INTO organizations (name, slug, email, phone, plan, status, trial_ends_at, max_users, max_products) VALUES
('Ben''s Burger', 'bensburger', 'contact@bensburger.fr', '+33612345678', 'starter', 'active', CURRENT_TIMESTAMP + INTERVAL '14 days', 10, 200);

-- Users
INSERT INTO users (organization_id, username, pin_code, first_name, last_name, role, email, is_active) VALUES
(LAST_INSERT_ID(), 'patrick', '$2a$10$...', 'Patrick', 'Martin', 'admin', 'patrick@bensburger.fr', true),
(LAST_INSERT_ID(), 'sophie', '$2a$10$...', 'Sophie', 'Dubois', 'cashier', 'sophie@bensburger.fr', true),
(LAST_INSERT_ID(), 'lucas', '$2a$10$...', 'Lucas', 'Bernard', 'cashier', 'lucas@bensburger.fr', true);

-- Produits : Burgers
INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active) VALUES
(LAST_INSERT_ID(), 'Classic Burger', 8.33, 10.00, 'burgers', true),
(LAST_INSERT_ID(), 'Cheese Burger', 9.17, 10.00, 'burgers', true),
(LAST_INSERT_ID(), 'Bacon Burger', 10.00, 10.00, 'burgers', true),
(LAST_INSERT_ID(), 'Veggie Burger', 8.33, 10.00, 'burgers', true);

-- Produits : Frites
INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active) VALUES
(LAST_INSERT_ID(), 'Frites', 2.73, 10.00, 'sides', true),
(LAST_INSERT_ID(), 'Nuggets (x6)', 4.55, 10.00, 'sides', true);

-- Produits : Boissons
INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active) VALUES
(LAST_INSERT_ID(), 'Coca-Cola 33cl', 2.27, 10.00, 'drinks', true),
(LAST_INSERT_ID(), 'Sprite 33cl', 2.27, 10.00, 'drinks', true),
(LAST_INSERT_ID(), 'Eau 50cl', 1.82, 10.00, 'drinks', true);

-- Menus
INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_menu, is_active) VALUES
(LAST_INSERT_ID(), 'Menu Classic', 12.27, 10.00, 'menus', true, true);

-- Subscription
INSERT INTO subscriptions (organization_id, plan, status, price_cents, current_period_start, current_period_end) VALUES
(LAST_INSERT_ID(), 'starter', 'active', 2900, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month');
```

---

## 🔲 PHASE 6 : INFRASTRUCTURE PRODUCTION

### 1. Docker Compose Production
`docker-compose.prod.yml` :
```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - flexpos_network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
    restart: unless-stopped

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: https://api.flexpos.app
    restart: unless-stopped

  frontend-landing:
    build: ./frontend-landing
    restart: unless-stopped

  frontend-admin:
    build: ./frontend-admin
    restart: unless-stopped
```

### 2. Caddy Reverse Proxy
`caddy/Caddyfile` :
```
www.flexpos.app, flexpos.app {
    reverse_proxy frontend-landing:80
}

app.flexpos.app {
    reverse_proxy frontend:80
}

admin.flexpos.app {
    reverse_proxy frontend-admin:80
}

api.flexpos.app {
    reverse_proxy backend:3000
}
```

### 3. Scripts Déploiement
`scripts/deploy.sh` :
```bash
#!/bin/bash
set -e

echo "🚀 Déploiement FlexPOS Production..."

# Pull latest
git pull origin main

# Build images
docker-compose -f docker-compose.prod.yml build

# Stop old containers
docker-compose -f docker-compose.prod.yml down

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

echo "✅ Déploiement terminé !"
```

`scripts/backup.sh` :
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/flexpos"
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.dump"

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U postgres pos_burger > $BACKUP_FILE
gzip $BACKUP_FILE

echo "✅ Backup créé : $BACKUP_FILE.gz"
```

`scripts/restore.sh` :
```bash
#!/bin/bash
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file.dump>"
  exit 1
fi

docker-compose exec -T postgres psql -U postgres -d pos_burger < $BACKUP_FILE

echo "✅ Restauration terminée"
```

### 4. Monitoring Sentry
`backend/src/utils/sentry.js` :
```js
const Sentry = require('@sentry/node');
const config = require('../config/env');

if (config.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

module.exports = Sentry;
```

Intégrer dans `server.js` :
```js
const Sentry = require('./utils/sentry');

// Avant les routes
app.use(Sentry.Handlers.requestHandler());

// Après les routes (avant errorHandler)
app.use(Sentry.Handlers.errorHandler());
```

---

## 🔲 PHASE 7 : TESTS & DOCUMENTATION

### 1. Tests Backend (Jest)
`backend/tests/admin/adminAuth.test.js` :
```js
test('Admin login avec credentials valides', async () => {
  const res = await request(app)
    .post('/api/admin/auth/login')
    .send({ identifier: 'admin@flexpos.app', password: 'Admin@2025' });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.admin.email).toBe('admin@flexpos.app');
  expect(res.body.data.token).toBeDefined();
});
```

### 2. Tests E2E (Playwright)
```bash
npm create playwright@latest
```

`tests/e2e/signup.spec.js` :
```js
test('Inscription nouveau restaurant', async ({ page }) => {
  await page.goto('https://www.flexpos.app/signup');
  await page.fill('[name="name"]', 'Test Restaurant');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/success/);
});
```

### 3. Documentation Production
`docs/PRODUCTION.md` :
- Setup serveur Ubuntu 24.04
- Configuration DNS (A records pour 4 sous-domaines)
- Installation Docker + Docker Compose
- Variables environnement production
- SSL automatique via Caddy
- Backup automatique (cron daily)
- Monitoring Sentry + UptimeRobot
- Logs centralisés

`docs/API_ADMIN.md` :
- Documentation Swagger/OpenAPI des routes admin
- Exemples requêtes avec curl
- Gestion des permissions

---

## 📊 RÉCAPITULATIF GLOBAL

### ✅ Déjà fait (Phases 1-2)
- Backend SaaS complet : Models, Controllers, Routes, Services
- Migrations SQL : subscriptions, invoices, admin_users
- Authentification super-admin
- Service email Brevo
- Cron jobs facturation & trials
- Configuration serveur

### 🔲 Reste à faire (Phases 3-7)
- Landing page React (signup public)
- Admin dashboard React
- Seed Ben's Burger
- Docker production + Caddy
- Scripts déploiement/backup
- Monitoring Sentry
- Tests automatisés
- Documentation complète

### 📦 Commandes d'installation complètes
```bash
# Backend
cd backend
npm install

# Frontend POS (existe déjà)
cd frontend
npm install

# Landing page (à créer)
cd frontend-landing
npm install

# Admin dashboard (à créer)
cd frontend-admin
npm install

# Démarrage dev
docker-compose up
```

### 🎯 Prochaines étapes immédiates
1. Exécuter migrations SQL :
   ```bash
   cd backend
   npm run db:migrate
   ```

2. Tester routes admin :
   ```bash
   curl -X POST http://localhost:3000/api/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"identifier":"admin@flexpos.app","password":"Admin@2025"}'
   ```

3. Créer frontend-landing (cf PHASE 3)

4. Créer frontend-admin (cf PHASE 4)

5. Créer seed Ben's Burger (cf PHASE 5)

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-11-18
**Développé par** : Claude Code (Anthropic)
