# 🧪 Guide Test Production Locale

## 📋 Prérequis

Vous avez déjà Docker qui fonctionne ✅

---

## 🔧 ÉTAPE 1 : Configuration .env

Le fichier `.env` à la racine du projet contient toutes les variables d'environnement.

### Variables obligatoires (déjà configurées)
```bash
NODE_ENV=production
DB_HOST=postgres
DB_PASSWORD=postgres_prod_2025
JWT_SECRET=dev-jwt-secret-for-local-testing
```

### Variables optionnelles (pour test local)

#### 📧 Brevo (Email) - OPTIONNEL pour test local
Si vous voulez tester l'envoi d'emails (signup, welcome email) :

1. Créer compte gratuit : https://www.brevo.com/ (300 emails/jour gratuits)
2. Aller dans **Settings > SMTP & API > API Keys**
3. Créer une clé API
4. Ajouter dans `.env` :
```bash
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@flexpos.app
FROM_NAME=FlexPOS
```

**Pour test sans email** : Laissez vide, les emails ne seront pas envoyés mais l'app fonctionnera.

#### 🔍 Sentry (Monitoring) - OPTIONNEL pour test local
Si vous voulez tester le monitoring d'erreurs :

1. Créer compte gratuit : https://sentry.io/
2. Créer un projet Node.js
3. Copier le DSN
4. Ajouter dans `.env` :
```bash
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456
```

**Pour test sans monitoring** : Laissez vide, pas d'impact sur l'app.

---

## 🌐 ÉTAPE 2 : Simuler les Domaines (Hosts)

Le docker-compose.prod.yml utilise 4 domaines. Pour tester en local, simulez-les :

```bash
# Éditer le fichier hosts
sudo nano /etc/hosts
```

Ajouter ces lignes :
```
127.0.0.1   www.flexpos.app
127.0.0.1   app.flexpos.app
127.0.0.1   admin.flexpos.app
127.0.0.1   api.flexpos.app
```

Sauvegarder : `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 🚀 ÉTAPE 3 : Lancer la Stack Production

```bash
# Arrêter docker-compose dev si actif
docker compose down

# Lancer docker-compose production
docker compose -f docker-compose.prod.yml up -d --build
```

⏱️ **Attendre 30 secondes** que tout démarre (Postgres, Backend, Frontends, Caddy)

---

## 🗄️ ÉTAPE 4 : Initialiser la Base de Données

```bash
# Attendre que PostgreSQL soit prêt
sleep 15

# Exécuter les migrations
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Charger les données Ben's Burger
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger -f /database/seeds/002_bensburger_complete.sql
```

---

## ✅ ÉTAPE 5 : Tester les URLs

### 🌍 Landing Page (Signup)
**URL** : http://www.flexpos.app

Ce que vous devriez voir :
- Page d'accueil FlexPOS
- Bouton Signup

### 💼 Application POS (Caisse)
**URL** : http://app.flexpos.app

Ce que vous devriez voir :
- Page de login FlexPOS

**Login Ben's Burger** :
- Username : `patrick`
- PIN : `1234`

### 🔐 Admin Dashboard (Super-Admin)
**URL** : http://admin.flexpos.app

Ce que vous devriez voir :
- Page de login Admin

**Login Super-Admin** :
- Email : `admin@flexpos.app`
- Password : `Admin@2025`

### 🔌 API Backend
**URL** : http://api.flexpos.app/health

Ce que vous devriez voir :
```json
{
  "status": "running",
  "timestamp": "2025-11-18T02:00:00.000Z"
}
```

---

## 🧪 ÉTAPE 6 : Tester le Flow Signup

### Test avec curl :
```bash
curl -X POST http://api.flexpos.app/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "Mon Restaurant",
    "email": "contact@monrestaurant.fr",
    "phone": "0612345678",
    "first_name": "Jean",
    "last_name": "Dupont",
    "password": "MonPassword123!"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Inscription réussie !",
  "organization": { "id": 2, "name": "Mon Restaurant", ... },
  "user": { "id": 3, "username": "jean.dupont", ... }
}
```

Si BREVO_API_KEY est configuré → Email de bienvenue envoyé ✅
Si vide → Pas d'email mais inscription réussie ✅

---

## 📊 ÉTAPE 7 : Vérifier les Logs

```bash
# Logs de tous les services
docker compose -f docker-compose.prod.yml logs -f

# Logs backend uniquement
docker compose -f docker-compose.prod.yml logs -f backend

# Logs Caddy (reverse proxy)
docker compose -f docker-compose.prod.yml logs -f caddy
```

---

## 🛑 Arrêter la Stack Production

```bash
docker compose -f docker-compose.prod.yml down
```

Pour revenir au dev :
```bash
docker compose up -d
```

---

## 🔍 Troubleshooting

### ❌ Problème : "Connection refused" sur les URLs

**Solution** : Vérifier que `/etc/hosts` est bien configuré
```bash
cat /etc/hosts | grep flexpos
```

### ❌ Problème : Backend ne démarre pas

**Solution** : Vérifier les logs
```bash
docker compose -f docker-compose.prod.yml logs backend
```

Cause fréquente : PostgreSQL pas encore prêt → Attendre 15s de plus

### ❌ Problème : "BREVO_API_KEY variable is not set"

**Solution** : C'est juste un WARNING. L'app fonctionne sans Brevo, les emails ne seront pas envoyés.

Pour supprimer le warning :
```bash
# Dans .env, mettre une valeur vide explicite
BREVO_API_KEY=""
```

### ❌ Problème : Port 80 ou 443 déjà utilisé

**Solution** : Caddy utilise les ports 80/443. Si occupés :
```bash
# Voir qui utilise le port 80
sudo lsof -i :80

# Arrêter le service (exemple Apache/Nginx)
sudo systemctl stop apache2
# ou
sudo systemctl stop nginx
```

---

## 📝 Résumé Configuration Minimale

### Pour tester SANS email (le plus simple) :

**.env** :
```bash
NODE_ENV=production
DB_HOST=postgres
DB_PASSWORD=postgres_prod_2025
JWT_SECRET=dev-jwt-secret-for-local-testing
BREVO_API_KEY=
SENTRY_DSN=
```

**/etc/hosts** :
```
127.0.0.1   www.flexpos.app
127.0.0.1   app.flexpos.app
127.0.0.1   admin.flexpos.app
127.0.0.1   api.flexpos.app
```

**Commandes** :
```bash
docker compose -f docker-compose.prod.yml up -d --build
sleep 15
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger -f /database/seeds/002_bensburger_complete.sql
```

**URLs** :
- Landing : http://www.flexpos.app
- App POS : http://app.flexpos.app (patrick / 1234)
- Admin : http://admin.flexpos.app (admin@flexpos.app / Admin@2025)
- API : http://api.flexpos.app/health

---

✅ **C'est tout !** Vous avez maintenant FlexPOS en mode production locale.
