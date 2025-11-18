#!/bin/bash
# ==============================================
# FLEXPOS - Script de backup PostgreSQL
# ==============================================

set -e

# Configuration
BACKUP_DIR="/home/user/BENSBURGER/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/flexpos_backup_$TIMESTAMP.sql"
RETENTION_DAYS=30 # Garder les backups pendant 30 jours

echo "💾 FLEXPOS - Backup PostgreSQL"
echo "=============================="
echo ""

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Vérifier si PostgreSQL est disponible
if ! docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
    echo "❌ Erreur: PostgreSQL n'est pas démarré"
    exit 1
fi

echo "📥 Backup de la base de données..."
echo "Fichier: $BACKUP_FILE"
echo ""

# Exécuter pg_dump
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U postgres \
    -d pos_burger \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_FILE" 2>&1

# Vérifier que le backup a réussi
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    # Compresser le backup
    echo ""
    echo "🗜️  Compression du backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"

    # Afficher la taille
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✅ Backup réussi !"
    echo "   Fichier: $BACKUP_FILE"
    echo "   Taille: $SIZE"

    # Nettoyer les anciens backups
    echo ""
    echo "🧹 Nettoyage des backups de plus de $RETENTION_DAYS jours..."
    find "$BACKUP_DIR" -name "flexpos_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

    # Lister les backups restants
    echo ""
    echo "📂 Backups disponibles:"
    ls -lh "$BACKUP_DIR"/flexpos_backup_*.sql.gz 2>/dev/null || echo "Aucun backup trouvé"

else
    echo "❌ Erreur lors du backup"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo ""
echo "💡 Pour restaurer ce backup:"
echo "   ./scripts/restore.sh $BACKUP_FILE"
echo ""
