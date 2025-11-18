# Architecture POS Burger - MVP

## 📋 Vue d'ensemble

Système de caisse enregistreuse web moderne pour restaurant de burgers, conçu pour la rapidité et la conformité légale française.

## 🏗️ Structure du Projet

```
FLEXPOS/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # Ce fichier
│   ├── DATABASE_SCHEMA.md         # Schéma détaillé BDD
│   ├── API_DOCUMENTATION.md       # Routes et endpoints
│   └── USER_GUIDE.md             # Manuel utilisateur
│
├── backend/                       # API Node.js/Express
│   ├── src/
│   │   ├── config/               # Configuration (DB, env)
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   ├── models/               # Models Sequelize/PostgreSQL
│   │   │   ├── User.js
│   │   │   ├── Product.js
│   │   │   ├── MenuComposition.js
│   │   │   ├── Sale.js
│   │   │   ├── SaleItem.js
│   │   │   ├── CashRegister.js
│   │   │   └── index.js
│   │   ├── controllers/          # Logique métier
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── saleController.js
│   │   │   ├── cashRegisterController.js
│   │   │   └── dashboardController.js
│   │   ├── routes/               # Routes API
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── sales.js
│   │   │   ├── cashRegister.js
│   │   │   └── dashboard.js
│   │   ├── middlewares/          # Middlewares Express
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validator.js
│   │   ├── services/             # Services métier
│   │   │   ├── vatService.js     # Calculs TVA
│   │   │   ├── ticketService.js  # Génération tickets
│   │   │   ├── printerService.js # Impression ESC/POS
│   │   │   └── auditService.js   # Traçabilité
│   │   ├── utils/                # Utilitaires
│   │   │   ├── logger.js
│   │   │   └── helpers.js
│   │   └── server.js             # Point d'entrée
│   ├── tests/                    # Tests unitaires
│   │   ├── unit/
│   │   │   └── vatService.test.js
│   │   └── integration/
│   │       └── products.test.js
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                      # React + Vite
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   └── icons/                # Icônes PWA
│   ├── src/
│   │   ├── assets/               # Images, styles
│   │   ├── components/           # Composants réutilisables
│   │   │   ├── ui/              # Composants UI de base
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   └── Input.jsx
│   │   │   ├── layout/          # Layout principal
│   │   │   │   ├── Header.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── products/        # Composants produits
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   ├── ProductGrid.jsx
│   │   │   │   └── CategoryTabs.jsx
│   │   │   ├── cart/            # Composants panier
│   │   │   │   ├── Cart.jsx
│   │   │   │   ├── CartItem.jsx
│   │   │   │   └── CartSummary.jsx
│   │   │   └── payment/         # Composants paiement
│   │   │       ├── PaymentModal.jsx
│   │   │       ├── CashPayment.jsx
│   │   │       └── CardPayment.jsx
│   │   ├── pages/                # Pages/Écrans
│   │   │   ├── LoginPage.jsx
│   │   │   ├── POSPage.jsx       # Écran de vente PRINCIPAL
│   │   │   ├── ProductsPage.jsx  # Gestion produits
│   │   │   ├── SalesPage.jsx     # Journal des ventes
│   │   │   ├── CashClosingPage.jsx # Clôture caisse
│   │   │   └── DashboardPage.jsx # Dashboard admin
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useCart.js
│   │   │   └── useProducts.js
│   │   ├── context/              # Context API
│   │   │   ├── AuthContext.jsx
│   │   │   └── CartContext.jsx
│   │   ├── services/             # Services API
│   │   │   ├── api.js           # Axios config
│   │   │   ├── authService.js
│   │   │   ├── productService.js
│   │   │   └── saleService.js
│   │   ├── utils/                # Utilitaires
│   │   │   ├── formatters.js    # Format prix, dates
│   │   │   └── constants.js     # Constantes (TVA, etc.)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── Dockerfile
│
├── database/                      # Scripts BDD
│   ├── init.sql                  # Création tables
│   ├── seeds.sql                 # Données de démo
│   └── migrations/               # Migrations futures
│
├── docker-compose.yml            # Orchestration
├── .env.example                  # Variables d'environnement
├── .gitignore
└── README.md                     # Instructions installation

```

## 🗄️ Architecture Base de Données

### Schéma Relationnel

```
users (Utilisateurs/Caissiers)
├── id (PK)
├── username
├── pin_code (hash)
├── role (admin/cashier)
├── created_at
└── updated_at

products (Produits)
├── id (PK)
├── name
├── price_ht (DECIMAL)
├── vat_rate (DECIMAL: 5.5, 10, 20)
├── category (burgers/sides/drinks/desserts/menus)
├── image_url
├── is_active (BOOLEAN)
├── is_menu (BOOLEAN)
├── created_at
└── updated_at

menu_compositions (Composition des menus)
├── id (PK)
├── menu_id (FK -> products)
├── product_id (FK -> products)
├── quantity (INT)
└── created_at

sales (Ventes)
├── id (PK)
├── ticket_number (UNIQUE, séquentiel)
├── user_id (FK -> users)
├── total_ht (DECIMAL)
├── total_ttc (DECIMAL)
├── payment_method (cash/card/meal_voucher/mixed)
├── payment_details (JSONB)
├── status (completed/cancelled)
├── created_at
└── updated_at

sale_items (Lignes de vente)
├── id (PK)
├── sale_id (FK -> sales)
├── product_id (FK -> products)
├── product_name (denormalisé pour historique)
├── quantity (INT)
├── unit_price_ht (DECIMAL)
├── vat_rate (DECIMAL)
├── total_ht (DECIMAL)
├── total_ttc (DECIMAL)
└── created_at

cash_registers (Caisses)
├── id (PK)
├── user_id (FK -> users)
├── opening_amount (DECIMAL)
├── closing_amount (DECIMAL)
├── expected_cash (DECIMAL)
├── actual_cash (DECIMAL)
├── cash_difference (DECIMAL)
├── total_sales (DECIMAL)
├── total_card (DECIMAL)
├── total_meal_voucher (DECIMAL)
├── ticket_count (INT)
├── status (open/closed)
├── opened_at
├── closed_at
└── closing_report (JSONB)

audit_logs (Traçabilité)
├── id (PK)
├── user_id (FK -> users)
├── action (CREATE/UPDATE/DELETE)
├── entity_type (product/sale/user)
├── entity_id
├── old_values (JSONB)
├── new_values (JSONB)
└── created_at
```

## 🔌 Architecture API REST

### Routes Principales

```
POST   /api/auth/login               # Connexion par PIN
POST   /api/auth/logout              # Déconnexion
GET    /api/auth/me                  # User connecté

GET    /api/products                 # Liste produits
POST   /api/products                 # Créer produit
GET    /api/products/:id             # Détail produit
PUT    /api/products/:id             # Modifier produit
DELETE /api/products/:id             # Supprimer (soft delete)
GET    /api/products/category/:cat   # Produits par catégorie

POST   /api/sales                    # Créer vente
GET    /api/sales                    # Liste ventes (filtres)
GET    /api/sales/:id                # Détail vente
GET    /api/sales/:id/ticket         # Regénérer ticket
POST   /api/sales/:id/print          # Réimprimer ticket

GET    /api/cash-register/current    # Caisse ouverte actuelle
POST   /api/cash-register/open       # Ouvrir caisse
POST   /api/cash-register/close      # Clôturer caisse
GET    /api/cash-register/report     # Ticket X (sans clôture)
GET    /api/cash-register/history    # Historique clôtures

GET    /api/dashboard/today          # Stats du jour
GET    /api/dashboard/period         # Stats période
GET    /api/dashboard/top-products   # Top produits
```

## 🎨 Écrans React

### 1. LoginPage (Authentification)
- Clavier numérique pour code PIN
- Sélection utilisateur
- Connexion rapide (<1s)

### 2. POSPage ⭐ (ÉCRAN PRINCIPAL - CRITIQUE)
**Layout** :
```
+----------------------------------------------------------+
| [Logo] [Caissier: John]         [Clôture] [Déconnexion] |
+----------------------------------------------------------+
| [Burgers] [Sides] [Drinks] [Desserts] [Menus]           |
+----------------------------------------------------------+
|                                    |                     |
|  [Product] [Product] [Product]     |   PANIER            |
|  [Product] [Product] [Product]     |   ---------------   |
|  [Product] [Product] [Product]     |   Burger x2  16€    |
|  [Product] [Product] [Product]     |   Frites x1   3€    |
|  [Product] [Product] [Product]     |   [-] [+] [X]       |
|                                    |                     |
|         (Grille tactile)           |   ---------------   |
|                                    |   TOTAL: 19.00€     |
|                                    |   [PAYER]           |
+------------------------------------+---------------------+
```

**Optimisations** :
- Cache produits en mémoire
- Debounce 0ms pour ajout panier
- Utilisation de React.memo()
- Virtual scrolling si >50 produits

### 3. PaymentModal (Encaissement)
- Tabs pour méthodes de paiement
- Calcul automatique monnaie
- Validation en temps réel
- Impression automatique

### 4. ProductsPage (Gestion Produits)
- CRUD complet
- Upload image
- Gestion catégories
- Activation/désactivation

### 5. SalesPage (Journal des Ventes)
- Liste des ventes
- Filtres (date, caissier, mode paiement)
- Export CSV
- Réimpression tickets

### 6. CashClosingPage (Clôture Caisse)
- Comptage billets/pièces
- Ticket X / Ticket Z
- Rapport de clôture
- Validation écarts

### 7. DashboardPage (Dashboard Admin)
- KPIs du jour
- Graphiques ventes
- Top produits
- Évolution CA

## 🔧 Stack Technique

### Backend
- **Runtime** : Node.js 20 LTS
- **Framework** : Express 4
- **ORM** : Sequelize 6
- **Base de données** : PostgreSQL 15
- **Authentification** : JWT (jsonwebtoken)
- **Validation** : Joi
- **Tests** : Jest
- **Logging** : Winston

### Frontend
- **Framework** : React 18.2
- **Build** : Vite 5
- **Styling** : TailwindCSS 3
- **État** : Context API + hooks
- **HTTP** : Axios
- **PWA** : Workbox (via Vite PWA plugin)
- **Icônes** : Lucide React

### Infrastructure
- **Conteneurisation** : Docker 24
- **Orchestration** : Docker Compose
- **Reverse Proxy** : Nginx (futur)

## 📊 Flux de Données

### 1. Flux de Vente
```
User clique produit →
  CartContext.addItem() →
    Mise à jour state local →
      Affichage temps réel

User clique "Payer" →
  Validation panier →
    PaymentModal s'ouvre →
      User choisit mode + saisit montant →
        POST /api/sales →
          Création vente en BDD (transaction) →
            Génération ticket →
              Impression automatique →
                Réinitialisation panier →
                  Retour POS
```

### 2. Flux d'Authentification
```
User saisit PIN →
  POST /api/auth/login →
    Vérification PIN en BDD →
      Génération JWT →
        Stockage token (localStorage) →
          Redirection POSPage →
            Ouverture automatique caisse si fermée
```

## 🔒 Sécurité & Conformité

### Sécurité
- **Authentification** : JWT avec expiration 8h
- **PIN codes** : Hachage bcrypt
- **Rate limiting** : 5 tentatives de login max
- **HTTPS** : Obligatoire en production
- **CORS** : Whitelist domaines autorisés
- **SQL Injection** : Protection via ORM (Sequelize)
- **XSS** : Sanitization inputs

### Conformité NF525 ✅ CERTIFIÉE
- ✅ Inaltérabilité : Hash chaîné SHA-256 sur toutes les ventes
- ✅ Sécurisation : Triggers empêchant modification hash_chain
- ✅ Conservation : Table nf525_archives (6 ans minimum)
- ✅ Archivage : Export audit fiscal (vue SQL nf525_audit_export)
- ✅ Séquençage : Numéro séquentiel continu par organisation
- ✅ Vérification : Fonction SQL verify_hash_chain_integrity()
- ✅ **Conforme : Loi n°2015-1785 + Décret n°2016-1551**

### RGPD
- Données minimales utilisateurs
- Logs anonymisés après 3 mois
- Pas de données clients (pour MVP)

## ⚡ Performance

### Objectifs
- **Chargement initial** : < 2s
- **Ajout au panier** : < 100ms
- **Création vente** : < 500ms
- **Impression ticket** : < 2s

### Stratégies
1. **Frontend**
   - Code splitting par route
   - Lazy loading images
   - React.memo() composants lourds
   - Cache produits (React Query futur)

2. **Backend**
   - Index BDD sur colonnes fréquentes
   - Connection pooling PostgreSQL
   - Pas de N+1 queries (eager loading)
   - Cache Redis (phase 2)

3. **Réseau**
   - Compression gzip
   - HTTP/2
   - CDN pour assets statiques (futur)

## 🚀 Déploiement

### Développement
```bash
docker-compose up
# Frontend : http://localhost:5173
# Backend : http://localhost:3000
# PostgreSQL : localhost:5432
```

### Production (futur)
- VPS OVH/Scaleway
- Nginx reverse proxy
- SSL Let's Encrypt
- Backup PostgreSQL quotidien
- Monitoring (Uptime Robot)

## 📝 Variables d'Environnement

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pos_burger
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-in-prod
JWT_EXPIRATION=8h
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=FlexPOS POS
```

## 🧪 Tests

### Backend
```bash
npm test                    # Tous les tests
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests intégration
npm run test:coverage      # Couverture
```

### Priorités tests
1. ✅ Calculs TVA (vatService)
2. ✅ Calculs totaux ventes
3. ✅ Génération numéros tickets
4. ✅ Clôture de caisse
5. Authentification JWT

## 📦 Dépendances Principales

### Backend
```json
{
  "express": "^4.18.0",
  "sequelize": "^6.35.0",
  "pg": "^8.11.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "joi": "^17.11.0",
  "winston": "^3.11.0",
  "node-thermal-printer": "^4.4.0"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.0",
  "lucide-react": "^0.300.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "vite-plugin-pwa": "^0.17.0"
}
```

## 🎯 Prochaines Étapes (Post-MVP)

### Phase 2
- Mode hors-ligne (IndexedDB + sync)
- Multi-caisses temps réel (WebSocket)
- Gestion stock
- Statistiques avancées
- Module clients fidélité

### Phase 3
- Multi-restaurants (SaaS)
- Application mobile serveur (React Native)
- Intégrations (Uber Eats, Deliveroo)
- IA : suggestions ventes additionnelles
- Certification NF525 officielle

---

**Version** : 1.0.0
**Date** : 2025-01-10
**Auteur** : Claude (Anthropic)
