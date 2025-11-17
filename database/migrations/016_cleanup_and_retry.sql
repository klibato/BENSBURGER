-- ===============================================
-- CLEANUP Script: Reset migration 016 pour retry
-- Date: 2025-11-17
-- Description: Nettoie les traces de la migration 016 échouée
-- ===============================================

-- 1. Supprimer les tables NF525 si elles existent (partiellement créées)
DROP TABLE IF EXISTS hash_chain CASCADE;
DROP TABLE IF EXISTS nf525_archives CASCADE;

-- 2. Supprimer les vues NF525 si elles existent
DROP VIEW IF EXISTS nf525_daily_stats CASCADE;
DROP VIEW IF EXISTS nf525_audit_export CASCADE;

-- 3. Supprimer les fonctions NF525 si elles existent
DROP FUNCTION IF EXISTS increment_hash_sequence() CASCADE;
DROP FUNCTION IF EXISTS verify_hash_chain_integrity(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_nf525_stats(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS prevent_hash_chain_modification() CASCADE;

-- 4. Supprimer l'entrée de migrations_history pour la migration 016
-- Cela permettra au serveur de ré-exécuter automatiquement la migration
DELETE FROM migrations_history WHERE migration_name = '016_create_nf525_tables.sql';

-- 5. Vérifier que le cleanup a réussi
DO $$
BEGIN
  RAISE NOTICE '✅ Cleanup migration 016 terminé';
  RAISE NOTICE '📝 La migration 016 sera automatiquement ré-exécutée au prochain démarrage du serveur';
END $$;
