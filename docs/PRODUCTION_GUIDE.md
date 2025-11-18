# 🚀 FLEXPOS - GUIDE DE PRODUCTION COMPLET
## Déploiement, Configuration & Maintenance

**Version** : 1.0.0
**Date** : 2025-11-18
**Environnement** : Production

---

## 📋 TABLE DES MATIÈRES

1. [Prérequis Serveur](#prérequis-serveur)
2. [Installation Initiale](#installation-initiale)
3. [Configuration DNS](#configuration-dns)
4. [Variables d'Environnement](#variables-denvironnement)
5. [Déploiement](#déploiement)
6. [SSL/TLS Automatique](#ssltls-automatique)
7. [Backup & Restauration](#backup--restauration)
8. [Monitoring & Logs](#monitoring--logs)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Sécurité](#sécurité)

---

## 🖥️ PRÉREQUIS SERVEUR

### Serveur Recommandé
- **OS** : Ubuntu 24.04 LTS ou Debian 12
- **CPU** : 2 vCPU minimum (4 vCPU recommandé)
- **RAM** : 4 GB minimum (8 GB recommandé)
- **Stockage** : 50 GB SSD minimum (100 GB recommandé)
- **Réseau** : IP publique fixe

### Fournisseurs Recommandés
- **OVHcloud** : VPS SSD à partir de 7€/mois
- **Scaleway** : DEV1-M à partir de 10€/mois
- **Hetzner** : CX21 à partir de 5€/mois
- **DigitalOcean** : Droplet 4GB à partir de 24$/mois

### Logiciels Requis
```bash
# Docker & Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Git
sudo apt install -y git

# Utilitaires
sudo apt install -y curl wget nano htop
```

---

## 🚀 INSTALLATION INITIALE

### 1. Cloner le Repository
```bash
cd /home/user
git clone https://github.com/klibato/BENSBURGER.git flexpos
cd flexpos
```

### 2. Créer le Fichier .env
```bash
cp .env.example .env
nano .env
```

Remplir avec vos valeurs (voir section Variables d'Environnement)

### 3. Créer les Dossiers Nécessaires
```bash
mkdir -p backups logs caddy/logs
```

### 4. Premier Déploiement
```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

---

## 🌐 CONFIGURATION DNS

### Enregistrements DNS Requis

Configurer **4 sous-domaines** pointant vers l'IP de votre serveur :

| Type | Nom | Valeur | Priorité |
|------|-----|--------|----------|
| A | `www` | `YOUR_SERVER_IP` | - |
| A | `app` | `YOUR_SERVER_IP` | - |
| A | `admin` | `YOUR_SERVER_IP` | - |
| A | `api` | `YOUR_SERVER_IP` | - |
| CNAME | `flexpos.app` | `www.flexpos.app` | - |

### Exemple Concret
Si votre serveur a l'IP `51.75.23.45` :

```
Type  Nom       Valeur
A     www       51.75.23.45
A     app       51.75.23.45
A     admin     51.75.23.45
A     api       51.75.23.45
CNAME @         www.flexpos.app
```

### Vérification DNS
```bash
# Vérifier que les DNS sont configurés
dig www.flexpos.app +short
dig app.flexpos.app +short
dig admin.flexpos.app +short
dig api.flexpos.app +short

# Tous doivent retourner l'IP de votre serveur
```

---

## ⚙️ VARIABLES D'ENVIRONNEMENT

### Fichier `.env` Complet

```bash
# ============================================
# BACKEND CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pos_burger
DB_USER=postgres
DB_PASSWORD=CHANGEME_STRONG_PASSWORD_HERE

# ============================================
# JWT CONFIGURATION
# ============================================
# Générer avec: openssl rand -base64 32
JWT_SECRET=CHANGEME_32_CHARS_RANDOM_STRING
JWT_EXPIRATION=8h

# ============================================
# EMAIL CONFIGURATION (Brevo)
# ============================================
# Créer compte gratuit sur https://www.brevo.com/
# API Key dans: Settings > SMTP & API > API Keys
BREVO_API_KEY=xkeysib-xxxxx
FROM_EMAIL=noreply@flexpos.app
FROM_NAME=FlexPOS

# ============================================
# MONITORING (Sentry)
# ============================================
# Créer compte sur https://sentry.io/
# Créer projet Node.js et copier DSN
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456

# ============================================
# PRINTER (Optional)
# ============================================
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

### Générer JWT_SECRET Sécurisé
```bash
openssl rand -base64 32
# Exemple: 8vYz2R4xN9pQ3mK7wL1jS5tA6dF0gH2e
```

### Générer DB_PASSWORD Sécurisé
```bash
openssl rand -base64 24
# Exemple: 9xT2qW5eR8yU4iO7pA3sD1fG
```

---

## 🚀 DÉPLOIEMENT

### Déploiement Automatique
```bash
./scripts/deploy.sh
```

Ce script effectue automatiquement :
1. Pull des dernières modifications Git
2. Build des images Docker
3. Arrêt des anciens containers
4. Backup de la BDD
5. Démarrage des nouveaux containers
6. Exécution des migrations
7. Vérification santé des services

### Déploiement Manuel (Étape par Étape)
```bash
# 1. Pull code
git pull origin main

# 2. Build images
docker-compose -f docker-compose.prod.yml build

# 3. Arrêter services
docker-compose -f docker-compose.prod.yml down

# 4. Backup BDD
./scripts/backup.sh

# 5. Démarrer services
docker-compose -f docker-compose.prod.yml up -d

# 6. Migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# 7. Vérifier logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Vérifier le Déploiement
```bash
# Status des containers
docker-compose -f docker-compose.prod.yml ps

# Logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# Health checks
curl https://api.flexpos.app/health
curl https://app.flexpos.app
curl https://admin.flexpos.app
curl https://www.flexpos.app
```

---

## 🔒 SSL/TLS AUTOMATIQUE

### Let's Encrypt avec Caddy

Caddy gère automatiquement les certificats SSL Let's Encrypt.

**Pas de configuration manuelle requise !**

Caddy va :
1. Détecter vos domaines dans le `Caddyfile`
2. Demander des certificats Let's Encrypt
3. Configurer HTTPS automatiquement
4. Renouveler les certificats automatiquement

### Vérifier SSL
```bash
# Vérifier certificat
openssl s_client -connect www.flexpos.app:443 -servername www.flexpos.app < /dev/null

# Vérifier date expiration
echo | openssl s_client -connect www.flexpos.app:443 2>/dev/null | openssl x509 -noout -dates

# Test SSL Labs (dans navigateur)
# https://www.ssllabs.com/ssltest/analyze.html?d=www.flexpos.app
```

### Logs Caddy
```bash
docker-compose -f docker-compose.prod.yml logs caddy
```

---

## 💾 BACKUP & RESTAURATION

### Backup Automatique Quotidien

Créer un cron job :
```bash
crontab -e
```

Ajouter :
```cron
# Backup quotidien à 2h du matin
0 2 * * * cd /home/user/flexpos && ./scripts/backup.sh >> /home/user/flexpos/logs/backup.log 2>&1
```

### Backup Manuel
```bash
./scripts/backup.sh
```

Les backups sont stockés dans `/home/user/flexpos/backups/` et conservés 30 jours.

### Restauration depuis Backup
```bash
# Lister les backups disponibles
ls -lh backups/

# Restaurer un backup spécifique
./scripts/restore.sh backups/flexpos_backup_20251118_123456.sql.gz
```

### Backup vers Stockage Externe (Recommandé)

```bash
# Installer rclone
curl https://rclone.org/install.sh | sudo bash

# Configurer avec AWS S3 / Google Drive / etc
rclone config

# Script de sync quotidien
cat > /home/user/sync-backups.sh << 'EOF'
#!/bin/bash
rclone sync /home/user/flexpos/backups/ myremote:flexpos-backups/ --log-file=/home/user/flexpos/logs/rclone.log
EOF

chmod +x /home/user/sync-backups.sh

# Ajouter au cron après le backup
0 3 * * * /home/user/sync-backups.sh
```

---

## 📊 MONITORING & LOGS

### Sentry (Monitoring Erreurs)

1. **Créer compte** : https://sentry.io/signup/
2. **Créer projet** : "Node.js"
3. **Copier DSN** et ajouter dans `.env`
4. **Redémarrer** : `docker-compose -f docker-compose.prod.yml restart backend`

### Logs Docker

```bash
# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f caddy

# Logs des 100 dernières lignes
docker-compose -f docker-compose.prod.yml logs --tail=100

# Logs d'aujourd'hui
docker-compose -f docker-compose.prod.yml logs --since=$(date -d 'today' +%Y-%m-%d)
```

### Logs Applicatifs

```bash
# Backend logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# Caddy logs
docker exec flexpos_caddy cat /var/log/caddy/api.log
docker exec flexpos_caddy cat /var/log/caddy/app.log
```

### Monitoring Ressources

```bash
# CPU/RAM des containers
docker stats

# Espace disque
df -h
du -sh backups/*

# Connexions PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Uptime Monitoring (Externe)

Configurer **UptimeRobot** (gratuit) :
1. Créer compte : https://uptimerobot.com/
2. Ajouter monitors :
   - `https://www.flexpos.app` (HTTP 200)
   - `https://app.flexpos.app` (HTTP 200)
   - `https://api.flexpos.app/health` (keyword: "running")

---

## 🔧 MAINTENANCE

### Mises à Jour

```bash
# Pull dernières modifications
git pull origin main

# Redéployer
./scripts/deploy.sh
```

### Redémarrer un Service
```bash
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart postgres
docker-compose -f docker-compose.prod.yml restart caddy
```

### Nettoyer Docker
```bash
# Supprimer images inutilisées
docker image prune -a -f

# Nettoyer volumes orphelins
docker volume prune -f

# Espace libéré
docker system df
```

### Mise à Jour PostgreSQL
```bash
# Backup complet avant upgrade !
./scripts/backup.sh

# Arrêter services
docker-compose -f docker-compose.prod.yml down

# Modifier version dans docker-compose.prod.yml
# Ex: postgres:15-alpine → postgres:16-alpine

# Redémarrer
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🛠️ TROUBLESHOOTING

### Backend ne démarre pas

```bash
# Vérifier logs
docker-compose -f docker-compose.prod.yml logs backend

# Problèmes fréquents:
# - JWT_SECRET manquant dans .env
# - PostgreSQL pas prêt (attendre 10s)
# - Port 3000 déjà utilisé
```

### PostgreSQL erreurs de connexion

```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker-compose.prod.yml ps postgres

# Tester connexion
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger -c "SELECT version();"

# Logs PostgreSQL
docker-compose -f docker-compose.prod.yml logs postgres | tail -50
```

### SSL ne fonctionne pas

```bash
# Vérifier DNS
dig www.flexpos.app +short

# Vérifier que les ports sont ouverts
sudo netstat -tulpn | grep :443
sudo netstat -tulpn | grep :80

# Logs Caddy
docker-compose -f docker-compose.prod.yml logs caddy

# Forcer renouvellement certificat
docker-compose -f docker-compose.prod.yml restart caddy
```

### Espace disque plein

```bash
# Trouver ce qui prend de l'espace
du -sh /* | sort -h

# Nettoyer backups anciens (>30 jours)
find /home/user/flexpos/backups/ -name "*.sql.gz" -mtime +30 -delete

# Nettoyer logs Docker
docker system prune -a --volumes -f
```

### Performances dégradées

```bash
# Vérifier charge système
top
htop

# Vérifier containers
docker stats

# Vérifier connexions BDD
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Redémarrer services
docker-compose -f docker-compose.prod.yml restart
```

---

## 🔐 SÉCURITÉ

### Checklist Sécurité Production

- [ ] JWT_SECRET fort (32+ caractères)
- [ ] DB_PASSWORD fort (24+ caractères)
- [ ] HTTPS uniquement (Caddy force HTTPS)
- [ ] Firewall configuré (UFW)
- [ ] Fail2ban installé
- [ ] Backups quotidiens automatiques
- [ ] Monitoring Sentry configuré
- [ ] Logs centralisés
- [ ] Mises à jour système régulières
- [ ] Admin super-admin password changé
- [ ] Rate limiting activé (Express)
- [ ] CORS configuré correctement

### Configurer Firewall (UFW)

```bash
# Installer UFW
sudo apt install ufw

# Règles
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Activer
sudo ufw enable
sudo ufw status
```

### Fail2ban (Protection Brute Force)

```bash
# Installer
sudo apt install fail2ban

# Créer config Caddy
sudo nano /etc/fail2ban/filter.d/caddy.conf
```

Ajouter :
```ini
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"status":401.*$
            ^.*"remote_ip":"<HOST>".*"status":403.*$
ignoreregex =
```

```bash
# Activer jail
sudo nano /etc/fail2ban/jail.local
```

Ajouter :
```ini
[caddy]
enabled = true
port = http,https
filter = caddy
logpath = /var/log/caddy/*.log
maxretry = 5
bantime = 3600
```

```bash
# Redémarrer fail2ban
sudo systemctl restart fail2ban
sudo fail2ban-client status caddy
```

### Mises à Jour Automatiques

```bash
# Installer unattended-upgrades
sudo apt install unattended-upgrades

# Configurer
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📞 SUPPORT & RESSOURCES

### Documentation Technique
- **PROJECT_MAP.md** : Cartographie complète
- **BACKEND_*.md** : Documentation backend
- **FRONTEND_OVERVIEW.md** : Documentation frontend
- **PRODUCTION_ROADMAP.md** : Plan de déploiement

### Ressources Externes
- **Caddy** : https://caddyserver.com/docs/
- **Docker** : https://docs.docker.com/
- **PostgreSQL** : https://www.postgresql.org/docs/
- **Sentry** : https://docs.sentry.io/
- **Brevo** : https://developers.brevo.com/

### Commandes Rapides

```bash
# Redémarrer tout
docker-compose -f docker-compose.prod.yml restart

# Voir logs backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Backup immédiat
./scripts/backup.sh

# Restaurer backup
./scripts/restore.sh backups/flexpos_backup_XXXXXX.sql.gz

# Status containers
docker-compose -f docker-compose.prod.yml ps

# Shell PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pos_burger

# Shell backend
docker-compose -f docker-compose.prod.yml exec backend sh
```

---

**Documentation mise à jour** : 2025-11-18
**Version FlexPOS** : 1.0.0
**Environnement** : Production
