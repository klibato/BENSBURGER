# 🚀 Guide de Déploiement Production - FlexPOS

Guide complet pour déployer FlexPOS en production sur un serveur Linux.

---

## 📋 Prérequis Serveur

### Système
- **OS** : Ubuntu 22.04 LTS ou Debian 12 (recommandé)
- **RAM** : Minimum 2GB, recommandé 4GB
- **Disque** : Minimum 20GB
- **CPU** : 2 cores minimum

### Logiciels
```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo apt update
sudo apt install docker-compose-plugin

# Vérifier l'installation
docker --version
docker compose version
```

### DNS Configuration
Configurer les enregistrements DNS pour pointer vers votre serveur :

```
Type A Records:
flexpos.app          → IP_DU_SERVEUR
www.flexpos.app      → IP_DU_SERVEUR
app.flexpos.app      → IP_DU_SERVEUR
admin.flexpos.app    → IP_DU_SERVEUR
api.flexpos.app      → IP_DU_SERVEUR
```

**Important** : Attendre la propagation DNS (peut prendre 1-24h)

---

## 🔧 Configuration

### 1. Cloner le projet

```bash
git clone https://github.com/klibato/BENSBURGER.git
cd BENSBURGER
git checkout claude/flexpos-production-launch-013X8QJHgCEFdqQnh2JvyKna
```

### 2. Créer le fichier .env

```bash
cp .env.example .env
nano .env
```

**Variables obligatoires** :

```bash
# Database
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=pos_burger

# JWT
JWT_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_base64_32
JWT_EXPIRATION=8h

# Email (Brevo/SendInBlue)
BREVO_API_KEY=xkeysib-your-api-key-here
FROM_EMAIL=noreply@flexpos.app
FROM_NAME=FlexPOS

# Sentry (optionnel)
SENTRY_DSN=https://your-sentry-dsn-here

# API URL (pour les frontends)
VITE_API_URL=https://api.flexpos.app
```

### 3. Générer des secrets forts

```bash
# JWT Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 24
```

---

## 🚀 Déploiement

### 1. Build et démarrage

```bash
# Build tous les containers (peut prendre 5-10 minutes)
docker compose -f docker-compose.prod.yml build

# Démarrer tous les services
docker compose -f docker-compose.prod.yml up -d

# Vérifier que tout démarre
docker compose -f docker-compose.prod.yml ps
```

**Résultat attendu** :
```
NAME               STATUS              PORTS
flexpos_caddy      Up (healthy)        80/tcp, 443/tcp
flexpos_postgres   Up (healthy)        5432/tcp
flexpos_backend    Up (healthy)        3000/tcp
flexpos_frontend   Up (healthy)        80/tcp
flexpos_landing    Up (healthy)        80/tcp
flexpos_admin      Up (healthy)        80/tcp
```

### 2. Vérifier les migrations

```bash
docker compose -f docker-compose.prod.yml logs backend | grep "migration"
```

Vous devez voir :
```
✅ 12 migration(s) SQL appliquée(s) avec succès
```

### 3. Charger les données de test (optionnel)

```bash
# Charger Ben's Burger
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger -f /database/seeds/002_bensburger_complete.sql
```

### 4. Vérifier SSL/HTTPS

Caddy va automatiquement obtenir des certificats Let's Encrypt. Vérifiez les logs :

```bash
docker compose -f docker-compose.prod.yml logs caddy | grep "certificate"
```

⏳ **Cela peut prendre 1-2 minutes** pour obtenir les certificats.

---

## 🌐 Accès aux Applications

Une fois déployé, accédez aux URLs :

| Service | URL | Description |
|---------|-----|-------------|
| 🏠 **Landing** | https://www.flexpos.app | Site vitrine |
| 💰 **POS App** | https://app.flexpos.app | Application caisse |
| 👨‍💼 **Admin** | https://admin.flexpos.app | Dashboard super-admin |
| 🔌 **API** | https://api.flexpos.app/health | API Backend |

### Comptes de test (si seed chargé)

**Organisation Ben's Burger** (ID: 2)
- Username: `patrick` / PIN: `1234` (Admin)
- Username: `sophie` / PIN: `5678` (Caissière)
- Username: `lucas` / PIN: `9012` (Caissier)

**Super-Admin FlexPOS** (ID: 1)
- Username: `admin`
- Password: `admin123` ⚠️ **À CHANGER IMMÉDIATEMENT**

---

## 📊 Monitoring et Logs

### Voir tous les logs en temps réel

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Logs par service

```bash
# Backend API
docker compose -f docker-compose.prod.yml logs -f backend

# Caddy (reverse proxy)
docker compose -f docker-compose.prod.yml logs -f caddy

# PostgreSQL
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Vérifier la santé des services

```bash
# Health check API
curl https://api.flexpos.app/health

# Health check Caddy
docker compose -f docker-compose.prod.yml ps

# Stats containers
docker stats
```

---

## 🔄 Mises à jour

### Déployer une nouvelle version

```bash
# 1. Récupérer les dernières modifications
git pull origin claude/flexpos-production-launch-013X8QJHgCEFdqQnh2JvyKna

# 2. Rebuild les containers modifiés
docker compose -f docker-compose.prod.yml build

# 3. Redémarrer avec zero-downtime (rolling update)
docker compose -f docker-compose.prod.yml up -d

# 4. Vérifier que tout fonctionne
docker compose -f docker-compose.prod.yml ps
```

### Rollback en cas de problème

```bash
# Revenir à la version précédente
git log --oneline -5  # Trouver le commit précédent
git checkout <commit-hash>

# Rebuild et redémarrer
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 💾 Sauvegardes

### Backup automatique de la base de données

```bash
# Créer un backup manuel
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres pos_burger > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer un backup
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres pos_burger < backup_20251118_120000.sql
```

### Configurer des backups automatiques (cron)

```bash
# Éditer le crontab
crontab -e

# Ajouter une ligne pour backup quotidien à 3h du matin
0 3 * * * cd /path/to/BENSBURGER && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres pos_burger | gzip > /backups/flexpos_$(date +\%Y\%m\%d).sql.gz

# Garder seulement les 30 derniers jours
0 4 * * * find /backups -name "flexpos_*.sql.gz" -mtime +30 -delete
```

---

## 🔒 Sécurité

### Checklist de sécurité production

- [ ] Changer le mot de passe PostgreSQL (DB_PASSWORD)
- [ ] Générer un nouveau JWT_SECRET unique
- [ ] Changer le mot de passe super-admin (admin/admin123)
- [ ] Configurer le firewall (UFW)
- [ ] Activer fail2ban pour protection SSH
- [ ] Configurer les backups automatiques
- [ ] Monitorer les logs régulièrement
- [ ] Mettre à jour le serveur régulièrement

### Firewall (UFW)

```bash
# Installer et configurer UFW
sudo apt install ufw

# Autoriser SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le firewall
sudo ufw enable

# Vérifier le status
sudo ufw status
```

### SSL/TLS

Caddy gère automatiquement :
- ✅ Certificats Let's Encrypt
- ✅ Renouvellement automatique
- ✅ Redirection HTTP → HTTPS
- ✅ HTTP/2 et HTTP/3
- ✅ Headers de sécurité (HSTS, CSP, etc.)

---

## 🛑 Arrêt et Suppression

### Arrêter tous les services

```bash
# Arrêter (garder les données)
docker compose -f docker-compose.prod.yml stop

# Arrêter et supprimer les containers (garder les volumes)
docker compose -f docker-compose.prod.yml down

# Arrêter et TOUT supprimer (données incluses) ⚠️ DANGER
docker compose -f docker-compose.prod.yml down -v
```

---

## 🐛 Résolution de Problèmes

### Problème : SSL ne fonctionne pas

**Symptômes** : ERR_SSL_PROTOCOL_ERROR ou ERR_CERT_AUTHORITY_INVALID

**Solutions** :
1. Vérifier que DNS pointe vers le serveur : `nslookup flexpos.app`
2. Vérifier les logs Caddy : `docker compose -f docker-compose.prod.yml logs caddy | grep -i error`
3. Vérifier que le port 443 est ouvert : `sudo ufw status`
4. Attendre 1-2 minutes pour l'obtention des certificats

### Problème : Backend ne démarre pas

**Symptômes** : Container backend en état "Restarting"

**Solutions** :
1. Vérifier les logs : `docker compose -f docker-compose.prod.yml logs backend`
2. Vérifier que PostgreSQL est démarré : `docker compose -f docker-compose.prod.yml ps postgres`
3. Vérifier les variables d'environnement dans .env
4. Vérifier la connexion DB : `docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger -c "SELECT 1;"`

### Problème : Migrations échouent

**Symptômes** : Erreurs SQL dans les logs backend

**Solutions** :
1. Vérifier que la base de données existe
2. Réinitialiser complètement la DB (⚠️ perte de données) :
```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

### Problème : Out of memory

**Symptômes** : Containers qui crashent aléatoirement

**Solutions** :
1. Vérifier la RAM disponible : `free -h`
2. Augmenter la RAM du serveur
3. Limiter la mémoire des containers dans docker-compose.prod.yml :
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## 📞 Support

### Logs utiles pour le support

```bash
# Tout exporter dans un fichier
docker compose -f docker-compose.prod.yml logs > logs_$(date +%Y%m%d_%H%M%S).txt

# Informations système
docker compose -f docker-compose.prod.yml ps > system_status.txt
docker stats --no-stream >> system_status.txt
```

### Commandes de diagnostic

```bash
# Vérifier la connectivité réseau
curl -v https://api.flexpos.app/health

# Vérifier les certificats SSL
echo | openssl s_client -connect api.flexpos.app:443 -servername api.flexpos.app 2>/dev/null | openssl x509 -noout -dates

# Vérifier les DNS
dig +short flexpos.app
dig +short api.flexpos.app

# Tester la base de données
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger -c "SELECT COUNT(*) FROM organizations;"
```

---

## ✅ Checklist Post-Déploiement

Une fois déployé, vérifier :

- [ ] Tous les containers sont "Up (healthy)"
- [ ] Les 12 migrations ont réussi
- [ ] SSL/HTTPS fonctionne sur tous les domaines
- [ ] API répond sur /health
- [ ] Landing page accessible sur www.flexpos.app
- [ ] App POS accessible sur app.flexpos.app
- [ ] Dashboard admin accessible sur admin.flexpos.app
- [ ] Login fonctionne avec les comptes de test
- [ ] Logs ne montrent pas d'erreurs critiques
- [ ] Backups automatiques configurés
- [ ] Firewall activé
- [ ] Monitoring en place

---

## 🎉 Félicitations !

FlexPOS est maintenant déployé en production ! 🚀

**Prochaines étapes recommandées** :
1. Configurer un monitoring (Sentry, Uptime Robot, etc.)
2. Mettre en place des alertes email/SMS
3. Documenter vos procédures internes
4. Former les utilisateurs
5. Planifier les maintenances

**Bon déploiement !** 🎊
