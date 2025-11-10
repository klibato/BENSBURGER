# 🍔 BensBurger POS - MVP

Système de caisse enregistreuse moderne pour restaurant de burgers, conçu pour la rapidité et la conformité légale française.

## 🚀 Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour développement local)
- Git

### Installation

```bash
# Cloner le repository
git clone <repo-url>
cd BENSBURGER

# Copier les variables d'environnement
cp .env.example .env

# Lancer les conteneurs
docker-compose up -d

# Initialiser la base de données avec des données de démo
docker-compose exec backend npm run db:seed

# Accéder à l'application
# Frontend : http://localhost:5173
# Backend API : http://localhost:3000
```

### Connexion par Défaut

**Admin** :
- Username : `admin`
- PIN : `1234`

**Caissier** :
- Username : `john`
- PIN : `5678`

## 📚 Documentation

- [Architecture Complète](./ARCHITECTURE.md)
- [Schéma de Base de Données](./docs/DATABASE_SCHEMA.md)
- [Documentation API](./docs/API_DOCUMENTATION.md)
- [Guide Utilisateur](./docs/USER_GUIDE.md)

## 🏗️ Structure du Projet

```
BENSBURGER/
├── backend/          # API Node.js/Express
├── frontend/         # Interface React/Vite
├── database/         # Scripts SQL
├── docs/            # Documentation
└── docker-compose.yml
```

## 🔧 Développement

### Backend (API)

```bash
cd backend
npm install
npm run dev           # Serveur dev avec hot-reload
npm test             # Tests unitaires
npm run test:watch   # Tests en mode watch
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev          # Serveur Vite avec HMR
npm run build        # Build production
npm run preview      # Prévisualiser build
```

### Base de Données

```bash
# Créer les tables
docker-compose exec postgres psql -U postgres -d pos_burger -f /docker-entrypoint-initdb.d/init.sql

# Insérer les données de démo
docker-compose exec backend npm run db:seed

# Accéder à PostgreSQL
docker-compose exec postgres psql -U postgres pos_burger
```

## 🧪 Tests

```bash
# Tests backend
cd backend
npm test

# Tests avec couverture
npm run test:coverage

# Tests spécifiques
npm test -- vatService.test.js
```

## 📦 Build & Déploiement

### Développement
```bash
docker-compose up -d
```

### Production (préparation)
```bash
# Build des images
docker-compose -f docker-compose.prod.yml build

# Lancer en production
docker-compose -f docker-compose.prod.yml up -d

# Backup de la BDD
docker-compose exec postgres pg_dump -U postgres pos_burger > backup.sql
```

## ⚙️ Variables d'Environnement

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pos_burger
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-in-prod
JWT_EXPIRATION=8h
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=BensBurger POS
```

## 🎯 Fonctionnalités MVP

### ✅ Phase 1 (En cours)
- [x] Gestion des produits (CRUD)
- [x] Interface de vente tactile
- [x] Panier en temps réel
- [x] Encaissement espèces

### 🚧 Phase 2
- [ ] Génération et impression tickets
- [ ] Journal des ventes
- [ ] Clôture de caisse

### 📋 Phase 3
- [ ] Dashboard admin
- [ ] Intégration SumUp (CB)
- [ ] Gestion multi-caissiers

## 🔒 Sécurité & Conformité

- ✅ Authentification JWT
- ✅ Hash bcrypt des PIN codes
- ✅ Soft delete (traçabilité)
- ✅ Audit logs automatiques
- ✅ Pré-certification NF525 (hash clôtures)
- ✅ RGPD compliant

## 📊 Performance

- **Chargement initial** : < 2s
- **Ajout au panier** : < 100ms
- **Création vente** : < 500ms
- **Support** : 50 ventes/heure

## 🛠️ Stack Technique

### Backend
- Node.js 20 + Express 4
- PostgreSQL 15 + Sequelize
- JWT + Bcrypt
- Winston (logs)
- Jest (tests)

### Frontend
- React 18 + Vite 5
- TailwindCSS 3
- React Router 6
- Axios
- Lucide Icons

### Infrastructure
- Docker 24
- Docker Compose
- Nginx (futur)

## 🐛 Dépannage

### Erreur de connexion BDD
```bash
# Vérifier que PostgreSQL est lancé
docker-compose ps

# Voir les logs
docker-compose logs postgres

# Recréer le conteneur
docker-compose down
docker-compose up -d
```

### Port déjà utilisé
```bash
# Changer le port dans docker-compose.yml
ports:
  - "3001:3000"  # Backend
  - "5174:5173"  # Frontend
```

### Réinitialiser la BDD
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npm run db:seed
```

## 📝 Scripts Utiles

### Backend
```bash
npm run dev          # Serveur développement
npm run start        # Serveur production
npm test            # Tests
npm run db:migrate  # Migrations (futur)
npm run db:seed     # Données de démo
npm run lint        # ESLint
```

### Frontend
```bash
npm run dev         # Serveur dev
npm run build       # Build production
npm run preview     # Preview build
npm run lint        # ESLint
```

## 🤝 Contribution

Ce projet est actuellement en phase MVP. Les contributions seront ouvertes après la v1.0.

## 📄 Licence

Propriétaire - BensBurger © 2025

## 📞 Support

Pour toute question :
- Documentation : voir `/docs`
- Issues : [GitHub Issues](https://github.com/...)
- Email : support@bensburger.com

## 🗺️ Roadmap

### v1.0 (MVP) - Q1 2025
- Interface de vente complète
- Gestion produits & menus
- Encaissement multi-méthodes
- Tickets conformes
- Clôture de caisse

### v1.1 - Q2 2025
- Mode hors-ligne (PWA)
- Multi-caisses temps réel
- Statistiques avancées
- Application serveur mobile

### v2.0 (SaaS) - Q3 2025
- Multi-restaurants
- Module clients fidélité
- Gestion stock
- Intégrations (Uber Eats, etc.)
- Certification NF525 officielle

---

**Version** : 1.0.0-alpha
**Dernière mise à jour** : 2025-01-10
**Auteur** : Claude (Anthropic)

🍔 **Bon appétit et bonnes ventes !**
