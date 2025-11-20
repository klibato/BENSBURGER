# AUDIT COMPLET FLEXPOS - PROMPT D'AUDIT

## OBJECTIF
Effectuer un audit technique complet du projet FlexPOS pour vérifier :
1. Conformité NF525 complète et correcte
2. Isolation multi-tenant parfaite (sécurité)
3. Flux complets fonctionnels (signup → POS → admin)
4. Nettoyage du code (suppression documentation inutile, code mort)
5. Optimisation de la structure du projet

## INSTRUCTIONS CRITIQUES POUR L'AUDIT

**RÈGLES ABSOLUES :**
- NE PAS créer de nouveaux fichiers sauf si strictement nécessaire pour corriger un bug
- NE PAS ajouter de documentation sauf si demandé explicitement
- NE PAS modifier du code qui fonctionne correctement
- VÉRIFIER d'abord, MODIFIER seulement si problème avéré
- LISTER tous les fichiers à supprimer AVANT de les supprimer
- DEMANDER confirmation avant toute suppression de fichier

---

## PARTIE 1 : AUDIT CONFORMITÉ NF525

### 1.1 Vérification Séquentialité des Factures

**Fichiers à vérifier :**
- `backend/src/models/Invoice.js` - Vérifier hooks beforeCreate
- `backend/src/controllers/invoiceController.js` - Vérifier logique de génération

**Points de contrôle :**
- [ ] Le compteur `invoice_counter` est-il bien incrémenté de manière atomique ?
- [ ] Y a-t-il un lock/transaction pour éviter les doublons en cas de concurrence ?
- [ ] Le format du numéro est-il conforme : `ORG-YYYY-NNNNNN` ?
- [ ] Tester : Créer 10 factures simultanément (Promise.all) → Vérifier qu'il n'y a pas de trous ni doublons

**Commande de test :**
```sql
SELECT invoice_number, created_at FROM invoices WHERE organization_id = X ORDER BY invoice_number;
-- Vérifier séquence continue sans trous
```

### 1.2 Vérification Immutabilité des Données Fiscales

**Fichiers à vérifier :**
- `backend/src/models/Invoice.js` - Vérifier hooks beforeUpdate
- `backend/src/models/InvoiceLine.js` - Vérifier hooks beforeUpdate
- `backend/src/controllers/invoiceController.js` - Vérifier qu'il n'y a pas de route PUT/PATCH

**Points de contrôle :**
- [ ] Hook beforeUpdate bloque-t-il TOUTE modification après création ?
- [ ] Vérifier que l'erreur retournée est claire : "Les factures sont immuables"
- [ ] Tester : Essayer de modifier une facture via API → Doit retourner 403/400
- [ ] Vérifier qu'il n'existe AUCUNE route permettant d'update une facture

**Test à effectuer :**
```bash
# Créer une facture puis essayer de la modifier
curl -X PATCH https://api.flexpos.app/api/invoices/1 -H "Authorization: Bearer TOKEN" -d '{"total_amount": 999}'
# Doit retourner erreur
```

### 1.3 Vérification Archive et Hash

**Fichiers à vérifier :**
- `backend/src/models/Invoice.js` - Vérifier champ signature_hash
- `backend/src/services/nf525Service.js` - Vérifier fonction calculateHash
- `backend/src/controllers/invoiceController.js` - Vérifier que le hash est calculé

**Points de contrôle :**
- [ ] Chaque facture a-t-elle un champ `signature_hash` non-null ?
- [ ] Le hash est-il calculé avec crypto.createHash('sha256') ?
- [ ] Le hash inclut-il : invoice_number + date + total_amount + organization_id ?
- [ ] Vérifier dans la base : `SELECT COUNT(*) FROM invoices WHERE signature_hash IS NULL;` → Doit être 0

**Requête SQL de vérification :**
```sql
SELECT id, invoice_number, signature_hash, created_at
FROM invoices
WHERE signature_hash IS NULL OR signature_hash = '';
-- Doit retourner 0 lignes
```

### 1.4 Vérification Clôture Journalière (Z Report)

**Fichiers à vérifier :**
- `backend/src/models/DailyReport.js` - Vérifier modèle
- `backend/src/controllers/dailyReportController.js` - Vérifier logique
- `backend/src/routes/dailyReportRoutes.js` - Vérifier routes

**Points de contrôle :**
- [ ] Le modèle DailyReport existe-t-il et est-il complet ?
- [ ] Les champs obligatoires : date, total_sales, total_transactions, organization_id, signature_hash
- [ ] Hook beforeUpdate bloque-t-il les modifications ?
- [ ] Y a-t-il une route POST pour créer un rapport quotidien ?
- [ ] Le rapport calcule-t-il bien la somme des ventes de la journée ?

### 1.5 Vérification Archivage 6 ans

**Fichiers à vérifier :**
- `backend/src/config/env.js` - Vérifier configuration retention
- `backend/src/services/archiveService.js` - Vérifier qu'il n'y a PAS de suppression automatique

**Points de contrôle :**
- [ ] Vérifier qu'il n'existe AUCUN script de suppression automatique de factures
- [ ] Grep dans tout le codebase : `grep -r "DELETE FROM invoices" backend/` → Doit retourner 0
- [ ] Vérifier qu'il n'y a pas de cron job de nettoyage
- [ ] Documenter : Comment archiver les factures de plus de 6 ans (manuel uniquement)

---

## PARTIE 2 : AUDIT ISOLATION MULTI-TENANT

### 2.1 Vérification Middleware Auth

**Fichier à auditer :** `backend/src/middlewares/auth.js`

**Points de contrôle :**
- [ ] Le middleware `requireAuth` extrait-il bien `organization_id` du token JWT ?
- [ ] Vérifie-t-il le statut de l'organisation (suspended, cancelled) ?
- [ ] Bloque-t-il l'accès si organisation suspendue avec message clair ?
- [ ] Attache-t-il `req.organizationId` à TOUTES les requêtes authentifiées ?

**Code à vérifier :**
```javascript
// Doit contenir :
if (organization.status === 'suspended') {
  return res.status(403).json({ error: { code: 'ORGANIZATION_SUSPENDED', message: ... } });
}
req.organizationId = user.organization_id;
```

### 2.2 Vérification Isolation dans les Controllers

**Fichiers à auditer :**
- `backend/src/controllers/invoiceController.js`
- `backend/src/controllers/productController.js`
- `backend/src/controllers/customerController.js`
- `backend/src/controllers/orderController.js`
- `backend/src/controllers/dailyReportController.js`
- `backend/src/controllers/userController.js`

**Pour CHAQUE controller :**
- [ ] TOUTES les requêtes de lecture filtrent-elles par `organization_id: req.organizationId` ?
- [ ] TOUTES les créations incluent-elles `organization_id: req.organizationId` ?
- [ ] Aucune requête ne permet d'accéder aux données d'une autre organisation ?

**Pattern à chercher dans CHAQUE findAll/findOne :**
```javascript
// BON :
where: {
  organization_id: req.organizationId,
  // autres conditions...
}

// MAUVAIS (à corriger) :
where: {
  // PAS de organization_id = FAILLE DE SÉCURITÉ
}
```

**Script de vérification :**
```bash
# Chercher tous les findAll/findOne sans organization_id
grep -n "findAll\|findOne" backend/src/controllers/*.js | grep -v "organization_id"
# Doit retourner UNIQUEMENT les controllers admin (qui ont accès à tout)
```

### 2.3 Test d'Isolation Pratique

**Test à effectuer manuellement :**
1. Créer 2 organisations : ORG_A et ORG_B
2. Dans ORG_A : Créer produit PROD_A, facture INV_A
3. Dans ORG_B : Créer produit PROD_B, facture INV_B
4. Se connecter comme utilisateur de ORG_A
5. Essayer d'accéder à PROD_B et INV_B via API
6. **Résultat attendu :** Erreur 404 ou 403, JAMAIS de données de ORG_B

**Commandes curl de test :**
```bash
# Login ORG_A
TOKEN_A=$(curl -X POST https://api.flexpos.app/api/auth/login -d '{"email":"orga@test.com","password":"xxx"}' | jq -r '.data.token')

# Essayer d'accéder à une facture de ORG_B
curl -H "Authorization: Bearer $TOKEN_A" https://api.flexpos.app/api/invoices/{ID_FACTURE_ORG_B}
# Doit retourner 404 ou 403, JAMAIS les données
```

### 2.4 Vérification Base de Données

**Requêtes SQL à exécuter :**
```sql
-- Vérifier que TOUTES les tables ont organization_id
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'organization_id';

-- Doit retourner : invoices, invoice_lines, products, customers, orders, order_lines, daily_reports, users

-- Vérifier qu'il n'y a pas de foreign key sans organization_id
SELECT * FROM invoices WHERE organization_id IS NULL;
SELECT * FROM products WHERE organization_id IS NULL;
SELECT * FROM customers WHERE organization_id IS NULL;
-- Toutes doivent retourner 0 lignes
```

---

## PARTIE 3 : AUDIT FLUX COMPLETS

### 3.1 Flux Signup Complet

**Étapes à tester manuellement :**
1. [ ] Accéder à `https://www.flexpos.app` → Landing page s'affiche
2. [ ] Cliquer sur "Commencer" → Formulaire signup
3. [ ] Remplir formulaire avec email unique → Message "Email de vérification envoyé"
4. [ ] Vérifier Brevo → Email reçu avec token
5. [ ] Cliquer sur lien → Redirection vers app.flexpos.app/login
6. [ ] Se connecter → Accès au POS

**Fichiers impliqués :**
- `frontend-landing/src/pages/SignupPage.jsx`
- `backend/src/controllers/signupController.js`
- `backend/src/services/emailService.js`

**Vérifications :**
- [ ] Email envoyé contient le bon lien : `https://app.flexpos.app/verify-email?token=XXX`
- [ ] Token expire après 24h
- [ ] Après vérification, utilisateur peut se connecter immédiatement

### 3.2 Flux Admin Complet

**Étapes à tester :**
1. [ ] Accéder à `https://admin.flexpos.app` → Page login admin
2. [ ] Se connecter avec super-admin → Dashboard admin
3. [ ] Voir statistiques : nombre d'orgs, MRR, ARR
4. [ ] Aller dans "Organisations" → Liste de toutes les orgs
5. [ ] Cliquer sur une org → Détails + utilisateurs
6. [ ] Suspendre l'org avec raison "Test suspension"
7. [ ] Se connecter comme utilisateur de cette org → Erreur 403 avec message
8. [ ] Réactiver l'org → Utilisateur peut à nouveau se connecter

**Fichiers impliqués :**
- `frontend-admin/src/pages/DashboardPage.jsx`
- `frontend-admin/src/pages/OrganizationDetailsPage.jsx`
- `backend/src/controllers/admin/adminOrganizationsController.js`
- `backend/src/middlewares/auth.js` (vérification suspension)

### 3.3 Flux POS Complet

**Étapes à tester :**
1. [ ] Se connecter sur `https://app.flexpos.app` → Dashboard POS
2. [ ] Créer un produit → Produit enregistré avec organization_id
3. [ ] Créer un client → Client enregistré avec organization_id
4. [ ] Créer une commande avec 2 produits → Order créé
5. [ ] Générer facture depuis la commande → Facture créée avec numéro séquentiel
6. [ ] Vérifier que la facture a un signature_hash
7. [ ] Essayer de modifier la facture → Erreur "Facture immuable"

**SQL à vérifier après :**
```sql
SELECT * FROM invoices WHERE organization_id = X ORDER BY created_at DESC LIMIT 1;
-- Vérifier : invoice_number, signature_hash, total_amount
```

---

## PARTIE 4 : NETTOYAGE DU CODE

### 4.1 Fichiers de Documentation à Supprimer

**Chercher et lister :**
```bash
find . -name "README.md" -o -name "CONTRIBUTING.md" -o -name "CHANGELOG.md" -o -name "TODO.md" -o -name "NOTES.md" -o -name "*.draft.*"
```

**À supprimer SI non utilisés :**
- [ ] Fichiers README redondants (garder uniquement le principal)
- [ ] Fichiers de notes de développement (NOTES.md, TODO.md, etc.)
- [ ] Fichiers de documentation auto-générés obsolètes
- [ ] Fichiers .draft, .old, .backup

**LISTER TOUS LES FICHIERS AVANT SUPPRESSION ET DEMANDER CONFIRMATION**

### 4.2 Code Mort et Commentaires

**Rechercher :**
```bash
# Fonctions commentées
grep -r "// function\|// const\|// async" backend/src frontend/src

# Imports inutilisés (nécessite analyse manuelle)
grep -r "^import.*from" frontend/src | sort | uniq

# Console.log oubliés
grep -r "console.log\|console.error" backend/src frontend/src
```

**À nettoyer :**
- [ ] Supprimer tous les `console.log` et `console.error` (remplacer par logger en backend)
- [ ] Supprimer les blocs de code commentés de plus de 10 lignes
- [ ] Supprimer les imports non utilisés
- [ ] Supprimer les variables déclarées mais jamais utilisées

### 4.3 Dépendances Inutilisées

**Pour chaque package.json :**
```bash
cd backend && npx depcheck
cd ../frontend && npx depcheck
cd ../frontend-admin && npx depcheck
cd ../frontend-landing && npx depcheck
```

**Actions :**
- [ ] Lister les dépendances inutilisées trouvées par depcheck
- [ ] Vérifier manuellement qu'elles ne sont vraiment pas utilisées
- [ ] Les supprimer de package.json et relancer `npm install`

### 4.4 Fichiers de Configuration Redondants

**Vérifier :**
- [ ] Y a-t-il des fichiers `.env.example` redondants ?
- [ ] Y a-t-il des `.env.production` inutilisés (tout passe par docker-compose) ?
- [ ] Y a-t-il des fichiers de config de tests non utilisés ?
- [ ] Y a-t-il des multiples fichiers .gitignore redondants ?

**Règle :** Garder uniquement les fichiers de config nécessaires à la production

---

## PARTIE 5 : OPTIMISATION STRUCTURE

### 5.1 Cohérence de l'Architecture Backend

**Vérifier :**
- [ ] Tous les modèles sont dans `backend/src/models/` ?
- [ ] Tous les controllers sont dans `backend/src/controllers/` ?
- [ ] Tous les middlewares sont dans `backend/src/middlewares/` ?
- [ ] Tous les services sont dans `backend/src/services/` ?
- [ ] Tous les routes sont dans `backend/src/routes/` ?

**Pattern de nommage :**
- [ ] Modèles : PascalCase (User.js, Invoice.js)
- [ ] Controllers : camelCase + Controller (userController.js)
- [ ] Routes : camelCase + Routes (userRoutes.js)
- [ ] Services : camelCase + Service (emailService.js, nf525Service.js)

### 5.2 Cohérence de l'Architecture Frontend

**Pour chaque frontend (frontend, frontend-admin, frontend-landing) :**
- [ ] Composants dans `src/components/`
- [ ] Pages dans `src/pages/`
- [ ] Services/Utils dans `src/services/` et `src/utils/`
- [ ] Contexts dans `src/contexts/`
- [ ] Hooks personnalisés dans `src/hooks/` (si applicable)

**Vérifier :**
- [ ] Pas de fichiers .jsx ou .js à la racine de src/
- [ ] Pas de dossiers vides
- [ ] Nommage cohérent : PascalCase pour composants/pages, camelCase pour services/utils

### 5.3 Optimisation Docker

**Vérifier docker-compose.prod.yml :**
- [ ] Multi-stage builds utilisés pour réduire taille des images ?
- [ ] Variables d'environnement bien organisées ?
- [ ] Pas de secrets en dur dans le fichier ?
- [ ] Health checks configurés pour tous les services ?

**Vérifier Dockerfiles :**
- [ ] Utilisation de .dockerignore pour exclure node_modules, .git, etc. ?
- [ ] Layers optimisés (COPY package*.json avant COPY . pour cache) ?
- [ ] Images de base à jour et sécurisées ?

### 5.4 Base de Données - Migrations

**Vérifier :**
```bash
ls -la database/migrations/
```

**Points de contrôle :**
- [ ] Les migrations sont-elles numérotées séquentiellement : 001_, 002_, 003_, etc. ?
- [ ] Chaque migration a-t-elle un nom descriptif ?
- [ ] Y a-t-il des migrations en double ou obsolètes ?
- [ ] Chaque migration peut-elle être rejouée sans erreur (idempotence) ?

**Tester :**
```bash
# Simuler une base vide et rejouer toutes les migrations
psql -U postgres -d test_flexpos < database/migrations/*.sql
```

---

## PARTIE 6 : SÉCURITÉ SUPPLÉMENTAIRE

### 6.1 Vérification des Secrets

**Chercher les secrets en dur :**
```bash
grep -r "password.*=.*'" backend/src frontend/src
grep -r "api_key\|apiKey" backend/src frontend/src
grep -r "secret.*=.*'" backend/src
```

**Points de contrôle :**
- [ ] AUCUN mot de passe en dur dans le code
- [ ] AUCUNE clé API en dur
- [ ] Tout passe par variables d'environnement (process.env.XXX)

### 6.2 Validation des Entrées

**Fichiers à vérifier :**
- Tous les controllers qui acceptent des données POST/PUT/PATCH

**Points de contrôle :**
- [ ] Validation avec Joi ou express-validator sur TOUTES les routes ?
- [ ] Sanitization des inputs (trim, escape) ?
- [ ] Limites de taille sur les champs texte (max length) ?
- [ ] Validation des formats (email, phone, etc.) ?

### 6.3 Rate Limiting

**Fichier :** `backend/src/middlewares/rateLimiter.js`

**Points de contrôle :**
- [ ] Rate limiting activé sur routes de login/signup ?
- [ ] Limites configurées de manière raisonnable (ex: 5 tentatives login / 15min) ?
- [ ] Rate limiting différent pour admin vs users normaux ?

### 6.4 Headers de Sécurité

**Fichier :** `caddy/Caddyfile`

**Points de contrôle :**
- [ ] Content-Security-Policy configuré pour tous les domaines ?
- [ ] X-Frame-Options: DENY ou SAMEORIGIN ?
- [ ] X-Content-Type-Options: nosniff ?
- [ ] Strict-Transport-Security (HSTS) activé ?

**Vérifier avec :**
```bash
curl -I https://app.flexpos.app | grep -i "x-frame\|content-security\|strict-transport"
```

---

## PARTIE 7 : TESTS FINAUX

### 7.1 Tests de Charge Légers

**Tester :**
```bash
# 100 requêtes simultanées sur endpoint de liste produits
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" https://api.flexpos.app/api/products
```

**Points de contrôle :**
- [ ] Temps de réponse moyen < 500ms ?
- [ ] Aucune erreur 500 ?
- [ ] Base de données gère la concurrence sans deadlock ?

### 7.2 Tests de Régression

**Après chaque modification du code :**
- [ ] Signup fonctionne toujours ?
- [ ] Login fonctionne toujours ?
- [ ] Création facture fonctionne toujours ?
- [ ] Admin dashboard accessible ?
- [ ] Suspension org fonctionne toujours ?

### 7.3 Vérification Logs

**Vérifier :**
```bash
docker logs flexpos_backend --tail 100
docker logs flexpos_frontend --tail 100
docker logs flexpos_caddy --tail 100
```

**Points de contrôle :**
- [ ] Pas d'erreurs non gérées dans les logs
- [ ] Pas de stack traces exposées
- [ ] Niveau de log approprié (pas de DEBUG en production)

---

## RAPPORT FINAL À PRODUIRE

Après l'audit, produire un rapport structuré :

### FORMAT DU RAPPORT :

```markdown
# RAPPORT AUDIT FLEXPOS

## 1. CONFORMITÉ NF525
- ✅ Séquentialité : OK / ❌ PROBLÈME : [description]
- ✅ Immutabilité : OK / ❌ PROBLÈME : [description]
- ✅ Hash/Archive : OK / ❌ PROBLÈME : [description]
- ✅ Clôture Journalière : OK / ❌ PROBLÈME : [description]
- ✅ Archivage 6 ans : OK / ❌ PROBLÈME : [description]

## 2. ISOLATION MULTI-TENANT
- ✅ Middleware auth : OK / ❌ FAILLE : [description]
- ✅ Controllers isolés : OK / ❌ FAILLE : [fichier:ligne]
- ✅ Tests isolation : OK / ❌ FUITE : [description]
- ✅ Base de données : OK / ❌ PROBLÈME : [description]

## 3. FLUX COMPLETS
- ✅ Signup : OK / ❌ PROBLÈME : [étape]
- ✅ Admin : OK / ❌ PROBLÈME : [étape]
- ✅ POS : OK / ❌ PROBLÈME : [étape]

## 4. NETTOYAGE
- 📁 Fichiers supprimés : [liste]
- 🧹 Lignes de code nettoyées : [nombre]
- 📦 Dépendances retirées : [liste]

## 5. OPTIMISATION
- 🏗️ Structure : [améliorations apportées]
- 🐳 Docker : [optimisations]
- 🗄️ Migrations : [état]

## 6. SÉCURITÉ
- 🔒 Secrets : OK / ❌ PROBLÈME
- ✅ Validation : OK / ❌ PROBLÈME
- 🚦 Rate Limiting : OK / ❌ PROBLÈME
- 🛡️ Headers : OK / ❌ PROBLÈME

## 7. BUGS TROUVÉS
- [ ] Bug 1 : [description + fichier:ligne]
- [ ] Bug 2 : [description + fichier:ligne]

## 8. RECOMMANDATIONS
1. [Recommandation 1]
2. [Recommandation 2]
```

---

## MÉTHODE D'EXÉCUTION DE L'AUDIT

1. **Démarrer par la lecture** : Lire TOUT ce prompt d'audit avant de commencer
2. **Suivre l'ordre** : Faire PARTIE 1, puis 2, puis 3, etc.
3. **Documenter tout** : Noter chaque vérification faite et son résultat
4. **Ne pas modifier avant d'avoir tout audité** : D'abord comprendre, ensuite agir
5. **Lister avant de supprimer** : TOUJOURS montrer la liste des fichiers à supprimer et demander confirmation
6. **Tester après chaque modification** : Si un bug est corrigé, re-tester immédiatement
7. **Produire le rapport final** : À la fin, créer le fichier AUDIT_REPORT.md avec les résultats

## COMMANDES UTILES

```bash
# État des containers
docker ps

# Logs en temps réel
docker logs -f flexpos_backend
docker logs -f flexpos_frontend

# Accès à la base de données
docker exec -it flexpos_db psql -U flexpos_user -d flexpos_db

# Rebuild après modification
docker-compose -f docker-compose.prod.yml up -d --build [service]

# Vérifier taille des images
docker images | grep flexpos

# Nettoyer Docker (ATTENTION : après confirmation uniquement)
docker system prune -a
```

---

## CRITÈRES DE SUCCÈS

L'audit est réussi si :
- ✅ NF525 : 100% des vérifications passent
- ✅ Multi-tenant : 0 faille de sécurité trouvée
- ✅ Flux : Tous les parcours utilisateurs fonctionnent de bout en bout
- ✅ Code : Propreté améliorée, pas de régression
- ✅ Structure : Cohérente et optimisée
- ✅ Sécurité : Aucun secret en dur, validation complète
- ✅ Tests : Pas de bugs critiques détectés

---

**DERNIER RAPPEL : NE PAS HALLUCINER**
- Vérifier le code RÉEL, pas ce qui "devrait" être là
- Exécuter les requêtes SQL pour confirmer
- Tester manuellement les flux critiques
- Lire les fichiers avec Read avant de les modifier
- Grep pour chercher, pas deviner
