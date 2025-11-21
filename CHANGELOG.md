# 📝 CHANGELOG - FlexPOS

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-11-20

**RELEASE MAJEURE - PRODUCTION READY**

Score d'audit : **100/100** ✅

Cette version marque la **conformité totale NF525** et la **production-readiness** de FlexPOS.

### ✨ Nouveautés

#### Conformité NF525 (Anti-fraude TVA)
- **Inaltérabilité des données fiscales** : Hook `beforeUpdate` empêchant toute modification de ventes après création
- **Signatures cryptographiques** : Hash SHA-256 sur toutes les factures et rapports Z
- **Chaîne de hachage** : Table `hash_chains` pour traçabilité complète des transactions
- **Rapports Z quotidiens** : Génération automatique/manuelle avec clôture journalière
- **Conservation 6 ans** : Aucune suppression automatique de données fiscales
- **Séquençage sécurisé** : Numéros de facture thread-safe via PostgreSQL sequences

#### Gestion des images produits
- **Upload d'images** : Support JPEG, PNG, WebP, GIF (max 5 MB)
- **Stockage local sécurisé** : Répertoire `backend/uploads/products/`
- **Serving statique** : Images accessibles publiquement via `/uploads/products/`
- **Isolation multi-tenant** : Préfixe `org_{id}` pour chaque image
- **Suppression automatique** : Remplacement d'image supprime l'ancienne

#### Architecture Multi-Tenant (SaaS)
- **Dashboard super-admin** : Gestion centralisée de toutes les organisations
- **Statistiques globales** : MRR, ARR, churn rate, ARPU
- **Suspension/Réactivation** : Contrôle des accès par organisation
- **Isolation totale** : Données strictement séparées par `organization_id`
- **Tests d'isolation** : Validation complète de la sécurité multi-tenant

### 🔧 Améliorations

#### Code Quality
- **Remplacement console.error par logger** : Journalisation professionnelle dans toute la codebase
- **Amélioration de la structure** : Séparation claire des responsabilités
- **Performance optimisée** : Requêtes SQL optimisées avec index appropriés
- **Gestion d'erreurs améliorée** : Catch blocks systématiques avec logging

#### Configuration
- **Fichier .dockerignore** : Optimisation des builds Docker (exclusion tests, docs, node_modules)
- **Variables d'environnement** : Meilleure gestion via `.env`
- **CORS configuré** : Origines autorisées pour frontend

#### Documentation
- **Documentation complète** : 5 nouveaux guides (NF525, User, Admin, API, Changelog)
- **Réorganisation** : Structure claire (deployment/, audit-reports/, archive/)
- **README.md mis à jour** : Badges actualisés (100/100, NF525 conforme)
- **Suppression docs obsolètes** : 9 fichiers redondants supprimés (~4,900 lignes)

### 🐛 Corrections de bugs

#### NF525 - Race condition factures
- **Problème** : `SELECT MAX(invoice_number) + 1` causait des doublons en concurrent
- **Solution** : Séquences PostgreSQL par année (`invoice_number_seq_2025`)
- **Migration** : `024_fix_invoice_number_race_condition.sql`
- **Résultat** : Génération thread-safe garantie

#### Immutabilité factures - Double protection
- **Problème** : Seul le hook Sequelize protégeait les factures
- **Solution** : Ajout d'un trigger SQL de vérification
- **Fichiers** : `backend/src/models/Invoice.js:155-183` + migration 023
- **Résultat** : Protection à 2 niveaux (application + base de données)

#### Gestion des erreurs API
- **Problème** : Erreurs mal formatées, pas de codes métier
- **Solution** : Standardisation format JSON avec codes d'erreur
- **Résultat** : Meilleure expérience développeur

### 🔒 Sécurité

- **Validation d'entrées** : Toutes les données utilisateur validées
- **Protection SQL injection** : Utilisation exclusive de Sequelize ORM
- **Protection XSS** : Sanitization des inputs
- **Rate limiting** : 100 req/min par défaut (ajustable par plan)
- **HTTPS only** : TLS 1.2+ obligatoire en production

### 📊 Tests

#### Tests automatisés
- **Tests isolation multi-tenant** : 100% réussis
- **Tests performance** : Temps de réponse < 100ms
- **Tests immutabilité** : Vérification NF525 complète
- **Tests séquençage** : 10 créations simultanées sans collision

#### Tests manuels production
- ✅ Test immutabilité ventes (erreur attendue)
- ✅ Test immutabilité factures (erreur attendue)
- ✅ Génération rapport Z (succès)
- ✅ Upload image produit (succès)
- ✅ Vérification hash SHA-256 (succès)

### 📦 Migration depuis 1.x

**Base de données :**

```bash
# Appliquer toutes les migrations
npm run migrate

# Migrations clés :
# - 023: Trigger immutabilité factures
# - 024: Séquences factures thread-safe
# - 025: Table daily_reports (rapports Z)
```

**Breaking changes :**

1. **Ventes non modifiables** : Les `UPDATE` sur `sales` sont maintenant interdits
2. **Format numéro facture** : Changement de `INV-000123` à `INV-2025-000123`
3. **Endpoint rapports Z** : Nouveau `/api/daily-reports/generate`

### 🔮 Roadmap

**Version 2.1.0 (Q1 2026) :**
- [ ] Mode hors ligne (offline-first)
- [ ] Synchronisation multi-caisses en temps réel
- [ ] Support QR codes pour paiements
- [ ] Export factures PDF automatique

**Version 2.2.0 (Q2 2026) :**
- [ ] Gestion de stock (inventaire)
- [ ] Commandes fournisseurs
- [ ] Statistiques avancées (IA)
- [ ] Application mobile (React Native)

---

## [1.5.0] - 2025-11-18

### ✨ Nouveautés
- **Abonnements** : Gestion des plans Starter/Pro/Business/Enterprise
- **Facturation automatique** : Génération factures mensuelles
- **Dashboard organisations** : Vue d'ensemble super-admin

### 🐛 Corrections
- Fix calcul TVA sur paiements mixtes
- Fix recherche produits avec caractères spéciaux

---

## [1.4.0] - 2025-11-10

### ✨ Nouveautés
- **Paiements mixtes** : Combinaison carte + tickets restaurant
- **Catégories produits** : Organisation par catégories
- **Impression tickets** : Support imprimantes thermiques

### 🔧 Améliorations
- Performance requêtes SQL (+30%)
- Interface POS redesignée

---

## [1.3.0] - 2025-10-28

### ✨ Nouveautés
- **Rapports analytiques** : Statistiques ventes par période
- **Export CSV** : Ventes et rapports exportables
- **Gestion utilisateurs** : Rôles cashier/manager/admin

### 🐛 Corrections
- Fix timezone rapports (Europe/Paris)
- Fix calcul rendu monnaie espèces

---

## [1.2.0] - 2025-10-15

### ✨ Nouveautés
- **Multi-tenant initial** : Support organisations multiples
- **API REST** : Endpoints ventes, produits, utilisateurs
- **JWT Authentication** : Sécurisation API

### 🔧 Améliorations
- Migration PostgreSQL (depuis SQLite)
- Architecture backend/frontend séparée

---

## [1.1.0] - 2025-09-20

### ✨ Nouveautés
- **Tickets restaurant** : Support paiement MEAL_VOUCHER
- **Code-barres** : Scan produits EAN13/EAN8
- **Recherche produits** : Recherche rapide par nom

### 🐛 Corrections
- Fix calcul TVA 5.5%
- Fix affichage prix avec décimales

---

## [1.0.0] - 2025-09-01

**PREMIÈRE RELEASE STABLE**

### ✨ Fonctionnalités initiales
- Interface de caisse (POS) basique
- Gestion produits (CRUD)
- Ventes avec paiement CASH/CARD
- Calcul automatique TVA (5.5%, 10%, 20%)
- Impression tickets de caisse
- Backend Node.js + Express
- Frontend React
- Base de données SQLite

---

## Format

### Types de changements

- **✨ Nouveautés** (`Added`) : Nouvelles fonctionnalités
- **🔧 Améliorations** (`Changed`) : Modifications de fonctionnalités existantes
- **🗑️ Dépréciations** (`Deprecated`) : Fonctionnalités bientôt supprimées
- **❌ Suppressions** (`Removed`) : Fonctionnalités supprimées
- **🐛 Corrections** (`Fixed`) : Corrections de bugs
- **🔒 Sécurité** (`Security`) : Correctifs de sécurité

---

**Légende versions :**
- **MAJOR** (x.0.0) : Breaking changes incompatibles
- **MINOR** (0.x.0) : Nouvelles fonctionnalités rétro-compatibles
- **PATCH** (0.0.x) : Corrections de bugs rétro-compatibles

---

**Dernière mise à jour :** 2025-11-20
**Version actuelle :** 2.0.0
**Statut :** ✅ PRODUCTION READY
