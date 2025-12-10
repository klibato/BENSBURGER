# Tests P1-6: JWT Refresh Tokens

## 🎯 Objectif
Valider l'implémentation complète du système de refresh tokens JWT

---

## 📋 Pré-requis

### 1. Appliquer la migration SQL
```bash
# Se connecter à la base de données PostgreSQL
docker compose -f backend/docker-compose.yml exec postgres psql -U flexpos_user -d flexpos_db

# Exécuter la migration
\i /docker-entrypoint-initdb.d/migrations/032_create_refresh_tokens_table.sql

# Vérifier que la table existe
\dt refresh_tokens
\d refresh_tokens

# Quitter
\q
```

### 2. Redémarrer le backend
```bash
cd backend
npm restart
# ou
docker compose restart backend
```

---

## 🧪 Tests Backend

### Test 1: Login génère access token + refresh token ✅

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "pin_code": "123456"
  }'
```

**Vérifications attendues:**
- ✅ Status 200
- ✅ Cookie `token` présent (access token, 15min)
- ✅ Cookie `refreshToken` présent (refresh token, 7 jours)
- ✅ Cookie `refreshToken` a `path=/api/auth/refresh`
- ✅ Les deux cookies ont `HttpOnly; Secure; SameSite=Strict`
- ✅ Réponse JSON contient `user` mais PAS les tokens

**Vérification BDD:**
```sql
SELECT * FROM refresh_tokens ORDER BY created_at DESC LIMIT 1;
-- Doit montrer le nouveau token créé pour cet utilisateur
```

---

### Test 2: Refresh token renouvelle access token ✅

**Attendre 1 minute (pour simuler expiration proche)**

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<TOKEN_FROM_LOGIN>" \
  -H "Content-Type: application/json"
```

**Vérifications attendues:**
- ✅ Status 200
- ✅ Nouveau cookie `token` généré (nouvel access token)
- ✅ Cookie `refreshToken` inchangé
- ✅ Réponse: `{ "success": true, "message": "Access token renouvelé" }`

---

### Test 3: Access token expiré → Refresh fonctionne ✅

**Attendre 16+ minutes après login** (ou modifier JWT expiration pour test)

**1. Tenter un appel authentifié avec access token expiré:**
```bash
curl -i http://localhost:3000/api/auth/me \
  -H "Cookie: token=<EXPIRED_TOKEN>"
```

**Résultat attendu:**
- ❌ Status 401 Unauthorized
- Message: "Token expiré" ou "Invalid token"

**2. Utiliser refresh token pour obtenir nouveau access token:**
```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<VALID_REFRESH_TOKEN>"
```

**Résultat attendu:**
- ✅ Status 200
- ✅ Nouveau access token valide dans cookie `token`

**3. Réessayer l'appel authentifié avec nouveau token:**
```bash
curl -i http://localhost:3000/api/auth/me \
  -H "Cookie: token=<NEW_TOKEN>"
```

**Résultat attendu:**
- ✅ Status 200
- ✅ Données utilisateur retournées

---

### Test 4: Logout révoque refresh token ✅

**Endpoint:** `POST /api/auth/logout`

**Request:**
```bash
curl -i -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: token=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>"
```

**Vérifications attendues:**
- ✅ Status 200
- ✅ Cookies `token` et `refreshToken` supprimés (Set-Cookie avec Max-Age=0)
- ✅ Réponse: `{ "success": true, "message": "Déconnexion réussie" }`

**Vérification BDD:**
```sql
SELECT * FROM refresh_tokens WHERE token = '<REFRESH_TOKEN>';
-- Le token doit avoir `revoked_at` rempli (timestamp de révocation)
```

**Tenter de réutiliser le refresh token révoqué:**
```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<REVOKED_TOKEN>"
```

**Résultat attendu:**
- ❌ Status 401 Unauthorized
- Message: "Refresh token invalide ou expiré"

---

### Test 5: Switch Cashier révoque ancien token et crée nouveau ✅

**Endpoint:** `POST /api/auth/switch-cashier`

**Request:**
```bash
curl -i -X POST http://localhost:3000/api/auth/switch-cashier \
  -H "Cookie: token=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cashier2",
    "pin_code": "654321"
  }'
```

**Vérifications attendues:**
- ✅ Status 200
- ✅ Nouveaux cookies `token` et `refreshToken` générés
- ✅ Anciens tokens révoqués en BDD
- ✅ Utilisateur dans la réponse correspond au nouveau caissier

**Vérification BDD:**
```sql
-- Ancien token révoqué
SELECT * FROM refresh_tokens WHERE token = '<OLD_REFRESH_TOKEN>';
-- Doit avoir `revoked_at` rempli

-- Nouveau token créé
SELECT * FROM refresh_tokens WHERE user_id = <NEW_USER_ID> ORDER BY created_at DESC LIMIT 1;
-- Doit montrer un nouveau token non révoqué
```

---

### Test 6: Refresh token invalide rejeté ✅

**1. Token inexistant:**
```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=INVALID_TOKEN_12345"
```

**Résultat attendu:**
- ❌ Status 401 Unauthorized
- Cookie `refreshToken` supprimé
- Message: "Refresh token invalide ou expiré"

**2. Token sans cookie:**
```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json"
```

**Résultat attendu:**
- ❌ Status 401 Unauthorized
- Message: "Refresh token requis"

**3. Token expiré (simuler en modifiant `expires_at` dans BDD):**
```sql
-- Simuler expiration
UPDATE refresh_tokens SET expires_at = NOW() - INTERVAL '1 day' WHERE token = '<TOKEN>';
```

```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<EXPIRED_TOKEN>"
```

**Résultat attendu:**
- ❌ Status 401 Unauthorized
- Message: "Refresh token invalide ou expiré"

---

### Test 7: Utilisateur désactivé ne peut pas refresh ✅

**1. Désactiver utilisateur:**
```sql
UPDATE users SET is_active = false WHERE id = <USER_ID>;
```

**2. Tenter refresh:**
```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<VALID_TOKEN_FOR_INACTIVE_USER>"
```

**Résultat attendu:**
- ❌ Status 401 Unauthorized
- Message: "Utilisateur introuvable ou inactif"
- Token révoqué en BDD

**3. Réactiver utilisateur:**
```sql
UPDATE users SET is_active = true WHERE id = <USER_ID>;
```

---

### Test 8: Nettoyage automatique des tokens expirés ✅

**À tester manuellement ou via script cron:**

```javascript
// Dans un script Node.js ou via console backend
const { RefreshToken } = require('./src/models');

async function testCleanup() {
  // Créer des tokens expirés pour test
  await RefreshToken.create({
    token: 'expired_token_test_1',
    user_id: 1,
    organization_id: 1,
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
  });

  console.log('Tokens avant nettoyage:', await RefreshToken.count());

  // Nettoyer
  const deleted = await RefreshToken.cleanExpired();
  console.log('Tokens supprimés:', deleted);

  console.log('Tokens après nettoyage:', await RefreshToken.count());
}

testCleanup();
```

**Vérifications:**
- ✅ Les tokens expirés sont supprimés
- ✅ Les tokens valides sont conservés

---

### Test 9: Multi-tenant isolation ✅

**Vérifier qu'un refresh token d'une organisation ne peut pas être utilisé pour une autre:**

**1. Login avec organisation A:**
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin_org_a", "pin_code": "123456"}'
```

**2. Vérifier organization_id dans BDD:**
```sql
SELECT token, user_id, organization_id FROM refresh_tokens ORDER BY created_at DESC LIMIT 1;
```

**3. Tenter d'utiliser ce token après switch vers organisation B:**
- Le middleware `tenantIsolation` doit bloquer toute tentative cross-organization
- Le refresh token est lié à `organization_id` donc impossible à réutiliser ailleurs

---

## 📊 Métriques à surveiller

### Performance
- ✅ Génération refresh token: < 50ms
- ✅ Validation refresh token: < 100ms (requête BDD)
- ✅ Révocation: < 50ms

### Sécurité
- ✅ Tokens générés avec crypto.randomBytes(64) = 128 caractères hex
- ✅ Cookies httpOnly + secure + sameSite=strict
- ✅ Access token: 15 minutes max
- ✅ Refresh token: 7 jours max
- ✅ Révocation automatique au logout
- ✅ Pas de tokens dans réponse JSON

### Base de données
```sql
-- Vérifier index créés
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'refresh_tokens';

-- Compter tokens actifs vs révoqués
SELECT
  COUNT(*) FILTER (WHERE revoked_at IS NULL) as active_tokens,
  COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens
FROM refresh_tokens;

-- Tokens par utilisateur
SELECT user_id, COUNT(*) as token_count
FROM refresh_tokens
WHERE revoked_at IS NULL AND expires_at > NOW()
GROUP BY user_id;
```

---

## ✅ Checklist de validation finale

- [ ] Migration SQL appliquée avec succès
- [ ] Table `refresh_tokens` créée avec tous les champs
- [ ] Index créés sur token, user_id, organization_id, expires_at
- [ ] Login génère access token (15min) + refresh token (7j)
- [ ] Refresh endpoint renouvelle access token
- [ ] Logout révoque refresh token
- [ ] Switch cashier gère rotation des tokens
- [ ] Tokens invalides/expirés rejetés
- [ ] Utilisateur désactivé ne peut pas refresh
- [ ] Multi-tenant isolation respectée
- [ ] Cookies httpOnly + secure + sameSite
- [ ] Pas de tokens en JSON
- [ ] Tests manuels passés
- [ ] Logs backend corrects (debug/info)

---

## 🚨 Problèmes potentiels et solutions

### Problème 1: "Cannot read property 'refreshToken' of undefined"
**Cause:** cookie-parser middleware non installé ou mal configuré
**Solution:** Vérifier que `app.use(cookieParser())` est avant les routes

### Problème 2: Refresh token cookie non envoyé
**Cause:** `path=/api/auth/refresh` trop restrictif
**Solution:** Le frontend doit appeler exactement `/api/auth/refresh`, pas `/api/auth/refresh/`

### Problème 3: Tokens révoqués mais pas supprimés
**Cause:** Fonction `cleanExpired()` pas appelée
**Solution:** Ajouter un cron job ou appeler périodiquement (ex: au démarrage serveur)

### Problème 4: "Token expired" mais refresh ne fonctionne pas
**Cause:** Frontend n'intercepte pas 401 pour appeler /refresh automatiquement
**Solution:** Voir section "Changements Frontend" ci-dessous

---

## 📝 Notes importantes

1. **Expiration access token réduite de 8h à 15min:** Impact UX positif (sécurité) mais nécessite frontend robuste
2. **Refresh token path restrictif:** Améliore sécurité mais frontend doit respecter path exact
3. **Révocation au logout:** Empêche réutilisation token volé après déconnexion
4. **Nettoyage manuel requis:** Prévoir cron job pour appeler `RefreshToken.cleanExpired()` quotidiennement

---

## 🎯 Résultat attendu

Si tous les tests passent:
- ✅ **P1-6 validé et opérationnel**
- ✅ Sécurité sessions renforcée (15min vs 8h)
- ✅ Expérience utilisateur préservée (refresh automatique)
- ✅ Révocation explicite possible
- ✅ Multi-tenant isolation maintenue
- ✅ Prêt pour production
