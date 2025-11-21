# 🔐 GUIDE SUPER-ADMIN - FlexPOS

**Version :** 2.0.0
**Date :** 2025-11-20
**Public :** Super-administrateurs FlexPOS

---

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Tableau de bord super-admin](#tableau-de-bord-super-admin)
3. [Gestion des organisations](#gestion-des-organisations)
4. [Suspension et réactivation](#suspension-et-réactivation)
5. [Gestion des abonnements](#gestion-des-abonnements)
6. [Statistiques globales](#statistiques-globales)
7. [Sécurité multi-tenant](#sécurité-multi-tenant)
8. [Maintenance et monitoring](#maintenance-et-monitoring)
9. [Procédures d'urgence](#procédures-durgence)

---

## 🎯 Introduction

### Qu'est-ce qu'un super-admin ?

Le **super-administrateur** (super-admin) est le **rôle le plus élevé** dans FlexPOS. Il a accès à :

- ✅ **Toutes les organisations** (multi-tenant)
- ✅ **Dashboard global** avec statistiques MRR, ARR
- ✅ **Gestion des abonnements** (création, suspension, facturation)
- ✅ **Monitoring des performances**
- ✅ **Accès base de données** (lecture seule recommandée)

**Responsabilités :**
- Créer et gérer les organisations clientes
- Gérer les abonnements et la facturation
- Surveiller la santé globale de la plateforme
- Intervenir en cas d'incident

### Accès au dashboard super-admin

**URL :**
```
https://app.flexpos.app/super-admin
```

**Authentification :**
- Email : Compte avec rôle `super_admin`
- Mot de passe : Complexité renforcée (min 12 caractères)
- 2FA recommandé

**Vérification du rôle :**
```sql
SELECT id, email, role FROM users WHERE role = 'super_admin';
```

---

## 📊 Tableau de bord super-admin

### Vue d'ensemble

Le dashboard super-admin affiche les **KPIs globaux** de FlexPOS :

```
┌─────────────────────────────────────────────────────────────┐
│                  FLEXPOS SUPER-ADMIN DASHBOARD              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 STATISTIQUES GLOBALES                                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Organisations│  │     MRR      │  │     ARR      │     │
│  │     127      │  │   45,890€    │  │  550,680€    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Ventes totales│  │  Utilisateurs│  │  Uptime      │     │
│  │   8,542/jour │  │     1,845    │  │   99.97%     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  📈 CROISSANCE (30 derniers jours)                          │
│                                                             │
│  Nouvelles organisations : +12 (+10.4%)                     │
│  Croissance MRR          : +3,240€ (+7.6%)                 │
│  Churn                   : 2 org (-1.6%)                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🏢 ORGANISATIONS RÉCENTES                                  │
│                                                             │
│  [ID: 127] Restaurant Le Bistrot - ACTIVE - Plan Pro       │
│  [ID: 126] Boulangerie Artisan  - TRIAL  - Plan Starter    │
│  [ID: 125] Café des Arts        - ACTIVE - Plan Business   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### KPIs disponibles

| KPI | Description | Calcul |
|-----|-------------|--------|
| **MRR** | Monthly Recurring Revenue | Somme des abonnements mensuels actifs |
| **ARR** | Annual Recurring Revenue | MRR × 12 |
| **Churn Rate** | Taux de désabonnement | Organisations perdues / Total × 100 |
| **ARPU** | Average Revenue Per User | MRR / Nombre d'organisations |
| **Lifetime Value** | Valeur client moyenne | ARPU / Churn Rate |
| **CAC** | Customer Acquisition Cost | Coût marketing / Nouveaux clients |

### API - Statistiques globales

```bash
GET /api/super-admin/stats
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

Response:
{
  "total_organizations": 127,
  "active_organizations": 115,
  "trial_organizations": 10,
  "suspended_organizations": 2,
  "mrr": 45890.00,
  "arr": 550680.00,
  "total_sales_today": 8542,
  "total_users": 1845,
  "uptime_percentage": 99.97,
  "new_organizations_30d": 12,
  "churn_30d": 2
}
```

---

## 🏢 Gestion des organisations

### Créer une nouvelle organisation

**Via le dashboard :**

1. Cliquez sur "Nouvelle organisation"
2. Remplissez le formulaire :
   - **Nom** : Nom de l'entreprise cliente
   - **Email contact** : Email du responsable
   - **Plan** : Starter / Pro / Business / Enterprise
   - **Période d'essai** : 14 jours (par défaut)
3. Cliquez sur "Créer"

**Via l'API :**

```bash
POST /api/super-admin/organizations
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "name": "Restaurant Le Bistrot",
  "contact_email": "contact@lebistrot.fr",
  "plan": "pro",
  "trial_days": 14,
  "address": "15 Rue de la Paix, 75001 Paris",
  "siret": "12345678901234",
  "vat_number": "FR12345678901"
}
```

**Réponse :**
```json
{
  "id": 128,
  "name": "Restaurant Le Bistrot",
  "status": "trial",
  "plan": "pro",
  "trial_ends_at": "2025-12-04T23:59:59Z",
  "created_at": "2025-11-20T10:30:00Z",
  "subscription": {
    "id": 256,
    "status": "trialing",
    "current_period_start": "2025-11-20",
    "current_period_end": "2025-12-04"
  }
}
```

**Actions automatiques après création :**
- ✅ Création de l'abonnement en période d'essai
- ✅ Génération du compte admin de l'organisation
- ✅ Envoi email de bienvenue avec identifiants
- ✅ Configuration des paramètres par défaut

### Consulter les organisations

**Liste complète :**

```bash
GET /api/super-admin/organizations?page=1&limit=50&status=active
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Filtres disponibles :**
- `status` : active, trial, suspended, cancelled
- `plan` : starter, pro, business, enterprise
- `search` : Recherche par nom ou email
- `sort` : created_at, mrr, sales_count

**Exemple de réponse :**
```json
{
  "total": 127,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "id": 127,
      "name": "Restaurant Le Bistrot",
      "status": "active",
      "plan": "pro",
      "monthly_price": 89.00,
      "users_count": 8,
      "sales_count_30d": 1245,
      "mrr_contribution": 89.00,
      "created_at": "2025-11-20T10:30:00Z"
    }
  ]
}
```

### Modifier une organisation

```bash
PUT /api/super-admin/organizations/127
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "name": "Restaurant Le Bistrot Paris",
  "contact_email": "nouveau@lebistrot.fr",
  "plan": "business"
}
```

**Champs modifiables :**
- ✅ Nom, adresse, SIRET
- ✅ Email de contact
- ✅ Plan d'abonnement (upgrade/downgrade)
- ⚠️ Status (utiliser les endpoints de suspension/réactivation)

### Supprimer une organisation

⚠️ **DANGER** : Suppression définitive et irréversible

**Procédure de sécurité :**

1. **Vérifier qu'il n'y a pas de données fiscales** (NF525)
   ```sql
   SELECT COUNT(*) FROM invoices WHERE organization_id = 127;
   SELECT COUNT(*) FROM daily_reports WHERE organization_id = 127;
   ```

2. **Si données fiscales présentes** : Archiver d'abord
   ```bash
   GET /api/super-admin/organizations/127/export
   ```

3. **Supprimer l'organisation**
   ```bash
   DELETE /api/super-admin/organizations/127?confirm=true
   Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
   ```

4. **Vérifier la suppression**
   ```sql
   SELECT * FROM organizations WHERE id = 127;
   -- Résultat attendu : 0 lignes
   ```

**Cascade de suppression automatique :**
- ✅ Tous les utilisateurs de l'organisation
- ✅ Tous les produits
- ✅ Toutes les catégories
- ⚠️ **Ventes et factures conservées** (obligation légale NF525)

---

## 🔒 Suspension et réactivation

### Suspendre une organisation

**Cas d'usage :**
- Non-paiement de l'abonnement
- Fraude détectée
- Violation des CGU
- Demande du client

**Procédure :**

```bash
POST /api/super-admin/organizations/127/suspend
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "reason": "Non-paiement de la facture INV-2025-000145",
  "notify_users": true
}
```

**Effets de la suspension :**
- ❌ Connexion bloquée pour tous les utilisateurs de l'organisation
- ❌ API retourne erreur 403 "Organization suspended"
- ✅ Données conservées intactes
- ✅ Factures et rapports Z restent accessibles en lecture seule

**Message affiché aux utilisateurs :**
```
┌───────────────────────────────────────────────┐
│  ⚠️  COMPTE SUSPENDU                          │
│                                               │
│  Votre organisation a été suspendue.          │
│  Raison : Non-paiement facture INV-2025-145   │
│                                               │
│  Contactez : support@flexpos.app              │
└───────────────────────────────────────────────┘
```

### Réactiver une organisation

```bash
POST /api/super-admin/organizations/127/reactivate
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "notes": "Paiement reçu le 2025-11-20. Réactivation immédiate."
}
```

**Effets de la réactivation :**
- ✅ Connexion immédiatement rétablie
- ✅ API fonctionnelle
- ✅ Email de confirmation envoyé
- ✅ Journalisation de l'action

### Historique des suspensions

```bash
GET /api/super-admin/organizations/127/suspension-history
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Exemple de réponse :**
```json
{
  "organization_id": 127,
  "suspension_history": [
    {
      "id": 45,
      "action": "suspended",
      "reason": "Non-paiement facture INV-2025-000145",
      "performed_by": "admin@flexpos.app",
      "performed_at": "2025-11-15T14:30:00Z"
    },
    {
      "id": 46,
      "action": "reactivated",
      "notes": "Paiement reçu",
      "performed_by": "admin@flexpos.app",
      "performed_at": "2025-11-20T09:15:00Z"
    }
  ]
}
```

---

## 💰 Gestion des abonnements

### Plans disponibles

| Plan | Prix mensuel | Utilisateurs | Fonctionnalités |
|------|--------------|--------------|-----------------|
| **Starter** | 29€ | 2 | POS basique, rapports Z |
| **Pro** | 89€ | 10 | POS + multi-postes + stats |
| **Business** | 199€ | 50 | POS + API + multi-magasins |
| **Enterprise** | Sur devis | Illimité | Tout + support dédié |

### Créer un abonnement

**Automatique lors de la création d'organisation :**

L'abonnement est créé automatiquement avec :
- Statut : `trialing` (période d'essai)
- Durée d'essai : 14 jours
- Première facture générée à la fin de l'essai

**Manuel (rare) :**

```bash
POST /api/super-admin/subscriptions
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "organization_id": 127,
  "plan": "pro",
  "billing_cycle": "monthly",
  "trial_days": 0,
  "start_date": "2025-11-20"
}
```

### Modifier un abonnement (Upgrade/Downgrade)

**Upgrade immédiat :**

```bash
PUT /api/super-admin/subscriptions/256
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "plan": "business",
  "prorate": true
}
```

**Effets :**
- Passage immédiat au plan Business
- Proratisation automatique (remboursement partiel + nouveau prix)
- Facture de régularisation générée

**Downgrade en fin de période :**

```bash
PUT /api/super-admin/subscriptions/256
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "plan": "starter",
  "apply_at_period_end": true
}
```

**Effets :**
- Changement appliqué à la fin du cycle en cours
- Notification envoyée à l'organisation
- Pas de remboursement

### Annuler un abonnement

```bash
DELETE /api/super-admin/subscriptions/256?immediately=false
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Paramètres :**
- `immediately=true` : Annulation immédiate (sans remboursement)
- `immediately=false` : Annulation en fin de période (par défaut)

**Statut après annulation :**
- Abonnement : `cancelled`
- Organisation : `cancelled` (accès en lecture seule)
- Données : Conservées (obligation légale)

### Facturation

**Génération automatique des factures :**

Les factures sont générées automatiquement :
- À la fin de la période d'essai
- Au début de chaque période de facturation
- Lors d'un upgrade (facture de régularisation)

**Consulter les factures d'une organisation :**

```bash
GET /api/super-admin/organizations/127/invoices
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Exemple de facture :**
```json
{
  "id": 145,
  "invoice_number": "INV-2025-000145",
  "organization_id": 127,
  "subscription_id": 256,
  "subtotal_cents": 8900,
  "tax_cents": 1780,
  "total_cents": 10680,
  "currency": "EUR",
  "tax_rate": "20.0",
  "period_start": "2025-11-01",
  "period_end": "2025-11-30",
  "due_date": "2025-12-01",
  "status": "pending",
  "signature_hash": "a3f8c9d2e1b4...",
  "created_at": "2025-11-01T00:00:00Z"
}
```

**Marquer une facture comme payée :**

```bash
PUT /api/super-admin/invoices/145/mark-paid
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

{
  "payment_method": "bank_transfer",
  "payment_date": "2025-11-05",
  "transaction_id": "SEPA-20251105-ABC123"
}
```

---

## 📈 Statistiques globales

### MRR (Monthly Recurring Revenue)

**Calcul :**
```sql
SELECT
  SUM(monthly_price) AS mrr
FROM subscriptions
WHERE status IN ('active', 'trialing');
```

**API :**
```bash
GET /api/super-admin/stats/mrr?period=30d
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Réponse :**
```json
{
  "current_mrr": 45890.00,
  "previous_mrr": 42650.00,
  "growth": 3240.00,
  "growth_percentage": 7.6,
  "breakdown_by_plan": {
    "starter": 5220.00,
    "pro": 28480.00,
    "business": 11590.00,
    "enterprise": 600.00
  }
}
```

### ARR (Annual Recurring Revenue)

**Formule :** ARR = MRR × 12

```bash
GET /api/super-admin/stats/arr
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

Response:
{
  "arr": 550680.00,
  "projected_arr_next_month": 589200.00
}
```

### Churn Rate

**Formule :** Churn = (Organisations perdues / Total organisations) × 100

```bash
GET /api/super-admin/stats/churn?period=30d
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN

Response:
{
  "churn_rate": 1.6,
  "lost_organizations": 2,
  "total_organizations": 125,
  "lost_mrr": 178.00,
  "churn_reasons": {
    "price": 1,
    "features": 0,
    "support": 0,
    "other": 1
  }
}
```

### Performance par organisation

**Top 10 organisations par chiffre d'affaires :**

```bash
GET /api/super-admin/stats/top-organizations?metric=revenue&limit=10
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Réponse :**
```json
{
  "metric": "revenue",
  "period": "30d",
  "organizations": [
    {
      "id": 87,
      "name": "Chaîne de restaurants Paris",
      "revenue_30d": 125890.50,
      "sales_count_30d": 4582,
      "average_ticket": 27.48,
      "plan": "enterprise"
    }
  ]
}
```

---

## 🔐 Sécurité multi-tenant

### Isolation des données

FlexPOS garantit une **isolation totale** des données entre organisations :

**Au niveau base de données :**

Toutes les tables sensibles incluent `organization_id` :

```sql
CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id),
  -- ... autres champs
);

CREATE INDEX idx_sales_org ON sales(organization_id);
```

**Au niveau applicatif :**

Middleware automatique sur toutes les requêtes :

```javascript
// backend/src/middleware/organizationContext.js
app.use((req, res, next) => {
  const user = req.user;

  if (user.role !== 'super_admin') {
    // Utilisateur normal : filtrer par son organization_id
    req.organizationId = user.organization_id;
  } else {
    // Super-admin : accès à toutes les organisations
    req.organizationId = req.query.organization_id || null;
  }

  next();
});
```

**Tests d'isolation :**

Voir [TESTS_POST_AUDIT.md](audit-reports/TESTS_POST_AUDIT.md) pour les tests complets.

### Vérification d'isolation

**Test manuel (SQL) :**

```sql
-- Organisation 6 ne doit PAS voir les ventes de l'organisation 8
SELECT COUNT(*) FROM sales
WHERE organization_id = 6;
-- Résultat : 47 ventes

SELECT COUNT(*) FROM sales
WHERE organization_id = 8;
-- Résultat : 0 ventes (car l'organisation 8 n'existe pas encore)

-- Test cross-contamination
SELECT COUNT(*) FROM sales
WHERE organization_id != 6;
-- Résultat : 0 (aucune fuite de données)
```

**Test API :**

```bash
# Connexion organisation 6
curl https://api.flexpos.app/api/sales \
  -H "Authorization: Bearer JWT_ORG_6"
# Résultat : Ventes de l'organisation 6 uniquement

# Connexion organisation 8 (si elle existait)
curl https://api.flexpos.app/api/sales \
  -H "Authorization: Bearer JWT_ORG_8"
# Résultat : Ventes de l'organisation 8 uniquement
```

### Audit trail

Toutes les actions super-admin sont journalisées :

```sql
CREATE TABLE admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Consulter les logs :**

```bash
GET /api/super-admin/audit-log?user_id=1&action=suspend&limit=100
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

---

## 🛠️ Maintenance et monitoring

### Santé de la plateforme

**Endpoint de health check :**

```bash
GET /api/health
```

**Réponse :**
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime_seconds": 2592000,
  "version": "2.0.0",
  "environment": "production"
}
```

### Monitoring des performances

**Métriques disponibles :**

```bash
GET /api/super-admin/metrics
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Réponse :**
```json
{
  "requests_per_minute": 847,
  "average_response_time_ms": 45,
  "error_rate_percentage": 0.03,
  "database_pool_usage": 42,
  "memory_usage_mb": 512,
  "cpu_usage_percentage": 23
}
```

### Alertes automatiques

**Configurées via webhook :**

- 🚨 Uptime < 99.5% (24h)
- 🚨 Temps de réponse > 500ms (moyenne 5 min)
- 🚨 Taux d'erreur > 1% (1h)
- 🚨 Espace disque < 10%
- 🚨 Échec de backup quotidien

### Sauvegardes

**Sauvegarde automatique PostgreSQL :**

```bash
# Sauvegarde quotidienne (3h du matin)
pg_dump -h localhost -U flexpos flexpos_production \
  | gzip > /backups/flexpos_$(date +%Y%m%d).sql.gz
```

**Restauration :**

```bash
gunzip < /backups/flexpos_20251120.sql.gz \
  | psql -h localhost -U flexpos flexpos_production
```

**Rétention :** 30 jours locaux + archivage AWS S3 (6 ans)

---

## 🚨 Procédures d'urgence

### Organisation piratée

**Signes :**
- Connexions depuis IPs inhabituelles
- Volume de ventes anormal
- Modifications suspectes de produits

**Actions immédiates :**

1. **Suspendre l'organisation**
   ```bash
   POST /api/super-admin/organizations/{id}/suspend
   {"reason": "Activité suspecte détectée"}
   ```

2. **Réinitialiser tous les mots de passe**
   ```sql
   UPDATE users
   SET password = NULL, must_change_password = TRUE
   WHERE organization_id = {id};
   ```

3. **Examiner les logs**
   ```bash
   GET /api/super-admin/audit-log?organization_id={id}&period=7d
   ```

4. **Contacter le client**
   - Email + téléphone
   - Expliquer la situation
   - Demander confirmation avant réactivation

### Perte de données

**Ne devrait JAMAIS arriver grâce à :**
- Réplication PostgreSQL (master-slave)
- Sauvegardes quotidiennes
- Archivage AWS S3

**Si cela arrive quand même :**

1. **Identifier la période de perte**
   ```sql
   SELECT MAX(created_at) FROM sales;
   ```

2. **Restaurer depuis backup**
   ```bash
   pg_restore -h localhost -U flexpos -d flexpos_production \
     /backups/flexpos_20251119.sql.gz
   ```

3. **Vérifier l'intégrité**
   ```sql
   SELECT COUNT(*) FROM sales;
   SELECT COUNT(*) FROM daily_reports;
   ```

4. **Informer les organisations affectées**

### Attaque DDoS

**Signes :**
- Ralentissement généralisé
- Erreurs 503 "Service Unavailable"
- Logs : milliers de requêtes par seconde depuis mêmes IPs

**Actions :**

1. **Activer Cloudflare DDoS protection**
   - Se connecter à Cloudflare
   - Security > DDoS > Enable "I'm Under Attack Mode"

2. **Limiter le rate limiting**
   ```nginx
   # /etc/nginx/nginx.conf
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   ```

3. **Bloquer les IPs malveillantes**
   ```bash
   iptables -A INPUT -s 203.0.113.0/24 -j DROP
   ```

4. **Monitorer en temps réel**
   ```bash
   tail -f /var/log/nginx/access.log | grep -v "200 OK"
   ```

### Panne base de données

**Signes :**
- Erreur "Cannot connect to database"
- Timeout sur toutes les requêtes

**Actions :**

1. **Vérifier PostgreSQL**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Redémarrer si nécessaire**
   ```bash
   sudo systemctl restart postgresql
   ```

3. **Basculer sur réplica (si disponible)**
   ```javascript
   // backend/src/config/database.js
   const sequelize = new Sequelize({
     host: 'replica.flexpos.app', // au lieu de master
     // ...
   });
   ```

4. **Investiguer les logs**
   ```bash
   sudo tail -100 /var/log/postgresql/postgresql-14-main.log
   ```

---

## 📞 Contacts et escalade

### Support client

**Niveaux de support :**

| Niveau | Délai de réponse | Type d'incident |
|--------|------------------|-----------------|
| **P0 - Critique** | 15 minutes | Plateforme down, perte de données |
| **P1 - Urgent** | 1 heure | Organisation suspendue, bugs bloquants |
| **P2 - Normal** | 4 heures | Bugs non-bloquants, questions |
| **P3 - Faible** | 24 heures | Demandes de fonctionnalités |

### Équipe technique

- **CTO** : cto@flexpos.app
- **DevOps** : devops@flexpos.app
- **Support** : support@flexpos.app
- **Urgence 24/7** : +33 1 23 45 67 89

### Documentation technique

- [DEPLOYMENT.md](deployment/DEPLOYMENT.md) - Guide déploiement
- [AUDIT_REPORT_COMPLETE.md](audit-reports/AUDIT_REPORT_COMPLETE.md) - Audit technique
- [NF525_COMPLIANCE.md](NF525_COMPLIANCE.md) - Conformité fiscale

---

**Dernière mise à jour :** 2025-11-20
**Version :** 2.0.0
**Statut :** ✅ PRODUCTION READY
