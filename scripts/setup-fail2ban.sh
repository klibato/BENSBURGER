#!/bin/bash

#######################################################
# 🔒 SCRIPT D'INSTALLATION FAIL2BAN - FlexPOS
#######################################################
# Description: Installe et configure fail2ban pour protéger
#              FlexPOS contre les attaques brute-force
# Usage: sudo bash scripts/setup-fail2ban.sh
#######################################################

set -e

echo "🔒 Installation et configuration de fail2ban pour FlexPOS"
echo "=========================================================="
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Ce script doit être exécuté avec sudo"
   exit 1
fi

# 1. Installation de fail2ban
echo "📦 Étape 1/5 : Installation de fail2ban..."
apt update
apt install -y fail2ban

# 2. Créer la configuration locale
echo "⚙️  Étape 2/5 : Configuration de fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
# Bannir pendant 1 heure (3600 secondes)
bantime = 3600

# Période de surveillance : 10 minutes
findtime = 600

# Nombre maximum de tentatives avant bannissement
maxretry = 5

# Action par défaut : bannir + envoyer email (optionnel)
action = %(action_)s

# Ignorer les IPs locales
ignoreip = 127.0.0.1/8 ::1

#
# PROTECTION SSH
#
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

#
# PROTECTION NGINX (FlexPOS API)
#
[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 10

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/access.log
maxretry = 2

#
# PROTECTION FLEXPOS API (tentatives de login échouées)
#
[flexpos-api-auth]
enabled = true
port = http,https
filter = flexpos-api-auth
logpath = /var/log/flexpos/backend.log
maxretry = 5
findtime = 300
bantime = 1800
EOF

echo "✅ Configuration /etc/fail2ban/jail.local créée"

# 3. Créer un filtre personnalisé pour FlexPOS API
echo "🔍 Étape 3/5 : Création du filtre FlexPOS..."
cat > /etc/fail2ban/filter.d/flexpos-api-auth.conf <<'EOF'
# Fail2Ban filter for FlexPOS API authentication failures
#
# Détecte les tentatives de connexion échouées sur l'API FlexPOS
#

[Definition]

# Pattern pour détecter les échecs de connexion
# Exemple de log: "Invalid credentials for user: user@example.com"
# Exemple de log: "Authentication failed for email: admin@flexpos.app"
failregex = ^.*Invalid credentials for user: <HOST>.*$
            ^.*Authentication failed for email: .*from IP: <HOST>.*$
            ^.*Failed login attempt for: .*from <HOST>.*$
            ^.*Login failed: Invalid password for user.*IP: <HOST>.*$

# Pattern à ignorer (connexions réussies)
ignoreregex = ^.*Successful login.*$
              ^.*User authenticated successfully.*$

# Date pattern (ISO 8601)
datepattern = ^%%Y-%%m-%%d[T ]%%H:%%M:%%S
EOF

echo "✅ Filtre /etc/fail2ban/filter.d/flexpos-api-auth.conf créé"

# 4. Créer le répertoire de logs FlexPOS si nécessaire
echo "📁 Étape 4/5 : Vérification des logs FlexPOS..."
mkdir -p /var/log/flexpos
touch /var/log/flexpos/backend.log
chown -R www-data:www-data /var/log/flexpos 2>/dev/null || true

echo "✅ Répertoire de logs créé"

# 5. Activer et démarrer fail2ban
echo "🚀 Étape 5/5 : Activation de fail2ban..."
systemctl enable fail2ban
systemctl restart fail2ban

# Attendre que fail2ban démarre
sleep 2

echo ""
echo "✅ fail2ban installé et configuré avec succès !"
echo ""
echo "📊 Status des jails actives :"
fail2ban-client status

echo ""
echo "🔍 Pour voir le détail d'une jail :"
echo "   sudo fail2ban-client status sshd"
echo "   sudo fail2ban-client status flexpos-api-auth"
echo ""
echo "📋 Commandes utiles :"
echo "   sudo fail2ban-client status              # Lister toutes les jails"
echo "   sudo fail2ban-client status sshd         # Détail jail SSH"
echo "   sudo fail2ban-client set sshd unbanip IP # Débannir une IP"
echo "   sudo tail -f /var/log/fail2ban.log       # Logs fail2ban"
echo ""
echo "⚠️  IMPORTANT : Configurez vos logs FlexPOS pour écrire dans /var/log/flexpos/backend.log"
echo ""
