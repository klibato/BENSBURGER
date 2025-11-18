#!/bin/bash
# ==============================================
# FLEXPOS - Script de restauration PostgreSQL
# ==============================================

set -e

# Vérifier l'argument
if [ -z "$1" ]; then
    echo "❌ Erreur: Fichier de backup requis"
    echo ""
    echo "Usage: $0 <fichier_backup.sql.gz>"
    echo ""
    echo "Exemple:"
    echo "  $0 /home/user/BENSBURGER/backups/flexpos_backup_20251118_123456.sql.gz"
    echo ""
    echo "📂 Backups disponibles:"
    ls -lh /home/user/BENSBURGER/backups/flexpos_backup_*.sql.gz 2>/dev/null || echo "Aucun backup trouvé"
    exit 1
fi

BACKUP_FILE="$1"

echo "♻️  FLEXPOS - Restauration PostgreSQL"
echo "====================================="
echo ""

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erreur: Fichier introuvable: $BACKUP_FILE"
    exit 1
fi

echo "📁 Fichier de backup: $BACKUP_FILE"
echo ""

# Demander confirmation
echo "⚠️  ATTENTION: Cette opération va:"
echo "   1. SUPPRIMER toutes les données actuelles"
echo "   2. Restaurer les données du backup"
echo ""
read -p "🤔 Confirmer la restauration ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restauration annulée"
    exit 1
fi

# Vérifier si PostgreSQL est disponible
if ! docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
    echo "❌ Erreur: PostgreSQL n'est pas démarré"
    exit 1
fi

# Créer un backup de sécurité avant la restauration
echo ""
echo "💾 Création d'un backup de sécurité..."
./scripts/backup.sh || echo "⚠️  Backup de sécurité échoué"

echo ""
echo "⏸️  Arrêt du backend pendant la restauration..."
docker-compose -f docker-compose.prod.yml stop backend

echo ""
echo "♻️  Restauration en cours..."

# Décompresser si nécessaire
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "🗜️  Décompression..."
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restaurer le backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql \
    -U postgres \
    -d pos_burger \
    < "$RESTORE_FILE"

# Nettoyer le fichier temporaire
if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm -f "$TEMP_FILE"
fi

echo ""
echo "🚀 Redémarrage du backend..."
docker-compose -f docker-compose.prod.yml start backend

# Attendre que le backend soit prêt
echo ""
echo "⏳ Attente de la disponibilité du backend..."
sleep 5

# Vérifier la santé du backend
if docker-compose -f docker-compose.prod.yml exec backend wget --quiet --tries=1 --spider http://localhost:3000/health 2>/dev/null; then
    echo ""
    echo "✅ Restauration réussie !"
    echo ""
    echo "🏥 Services redémarrés et opérationnels"
else
    echo ""
    echo "⚠️  Attention: Le backend pourrait ne pas être encore prêt"
    echo "Vérifiez les logs: docker-compose -f docker-compose.prod.yml logs backend"
fi

echo ""
