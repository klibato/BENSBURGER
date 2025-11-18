#!/bin/bash
# ==============================================
# FLEXPOS - Script de déploiement production
# ==============================================

set -e # Exit on error

echo "🚀 FLEXPOS - Déploiement Production"
echo "====================================="
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Erreur: docker-compose.prod.yml introuvable"
    echo "Exécutez ce script depuis le répertoire racine du projet"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env introuvable"
    echo "Copie de .env.example vers .env..."
    cp .env.example .env
    echo "⚠️  ATTENTION: Éditez .env avec vos vraies valeurs avant de continuer !"
    exit 1
fi

# Demander confirmation
read -p "🤔 Confirmer le déploiement en production ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Déploiement annulé"
    exit 1
fi

echo ""
echo "📥 1. Pull des dernières modifications..."
git pull origin main || true

echo ""
echo "🔨 2. Build des images Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "⏸️  3. Arrêt des anciens containers..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "🗄️  4. Backup de la base de données..."
./scripts/backup.sh || echo "⚠️  Backup échoué (peut-être première installation)"

echo ""
echo "🚀 5. Démarrage des nouveaux containers..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ 6. Attente de la disponibilité de la base de données..."
sleep 10

echo ""
echo "🔄 7. Exécution des migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run db:migrate || echo "⚠️  Migrations échouées"

echo ""
echo "🌱 8. Chargement du seed Ben's Burger (optionnel)..."
read -p "Charger le seed Ben's Burger ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d pos_burger -f /database/seeds/002_bensburger_complete.sql
    echo "✅ Seed chargé"
fi

echo ""
echo "🏥 9. Vérification de la santé des services..."
sleep 5
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📊 10. Logs des services (Ctrl+C pour quitter)..."
echo "Vérifiez qu'il n'y a pas d'erreurs dans les logs"
sleep 3
docker-compose -f docker-compose.prod.yml logs --tail=50 backend

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "🌐 URLs accessibles:"
echo "  - Landing page: https://www.flexpos.app"
echo "  - Application POS: https://app.flexpos.app"
echo "  - Dashboard Admin: https://admin.flexpos.app"
echo "  - API Backend: https://api.flexpos.app"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Vérifier que SSL fonctionne (Let's Encrypt auto)"
echo "  2. Tester une inscription sur www.flexpos.app/signup"
echo "  3. Se connecter avec le compte Ben's Burger (patrick / PIN 1234)"
echo "  4. Configurer les backups automatiques (cron)"
echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
echo "  - Redémarrer un service: docker-compose -f docker-compose.prod.yml restart [service]"
echo "  - Arrêter tout: docker-compose -f docker-compose.prod.yml down"
echo ""
