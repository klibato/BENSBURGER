-- ============================================
-- Migration: NF525 Immutability Triggers
-- Date: 2025-11-20
-- Description: Triggers PostgreSQL pour garantir l'inaltérabilité de hash_chain
--              Conforme décret n°2016-1551 (anti-fraude TVA)
-- ============================================

-- ============================================
-- TRIGGER 1: Bloquer UPDATE sur hash_chain
-- ============================================

-- Fonction trigger pour bloquer les modifications
CREATE OR REPLACE FUNCTION prevent_hash_chain_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NF525: Modification interdite sur hash_chain (inaltérabilité fiscale requise par décret n°2016-1551). Les données fiscales ne peuvent pas être modifiées après création.';
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS trg_prevent_hash_chain_update ON hash_chain;
CREATE TRIGGER trg_prevent_hash_chain_update
BEFORE UPDATE ON hash_chain
FOR EACH ROW
EXECUTE FUNCTION prevent_hash_chain_update();

COMMENT ON TRIGGER trg_prevent_hash_chain_update ON hash_chain IS
'NF525: Bloque toute modification de hash_chain pour garantir l''inaltérabilité des données fiscales (décret n°2016-1551)';

-- ============================================
-- TRIGGER 2: Bloquer DELETE sur hash_chain
-- ============================================

-- Fonction trigger pour bloquer les suppressions
CREATE OR REPLACE FUNCTION prevent_hash_chain_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NF525: Suppression interdite sur hash_chain (inaltérabilité fiscale requise par décret n°2016-1551). Les données fiscales doivent être conservées de manière immuable.';
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE DELETE
DROP TRIGGER IF EXISTS trg_prevent_hash_chain_delete ON hash_chain;
CREATE TRIGGER trg_prevent_hash_chain_delete
BEFORE DELETE ON hash_chain
FOR EACH ROW
EXECUTE FUNCTION prevent_hash_chain_delete();

COMMENT ON TRIGGER trg_prevent_hash_chain_delete ON hash_chain IS
'NF525: Bloque toute suppression de hash_chain pour garantir l''inaltérabilité des données fiscales (décret n°2016-1551)';

-- ============================================
-- TRIGGER 3: Bloquer TRUNCATE sur hash_chain
-- ============================================

-- Fonction trigger pour bloquer TRUNCATE
CREATE OR REPLACE FUNCTION prevent_hash_chain_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NF525: TRUNCATE interdit sur hash_chain (inaltérabilité fiscale requise par décret n°2016-1551). Les données fiscales ne peuvent pas être supprimées en masse.';
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE TRUNCATE
DROP TRIGGER IF EXISTS trg_prevent_hash_chain_truncate ON hash_chain;
CREATE TRIGGER trg_prevent_hash_chain_truncate
BEFORE TRUNCATE ON hash_chain
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_hash_chain_truncate();

COMMENT ON TRIGGER trg_prevent_hash_chain_truncate ON hash_chain IS
'NF525: Bloque TRUNCATE sur hash_chain pour garantir l''inaltérabilité des données fiscales (décret n°2016-1551)';

-- ============================================
-- VÉRIFICATION ET LOGS
-- ============================================

-- Vérifier que les triggers sont bien créés
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'trg_prevent_hash_chain_update',
    'trg_prevent_hash_chain_delete',
    'trg_prevent_hash_chain_truncate'
  )
  AND tgrelid = 'hash_chain'::regclass;

  IF trigger_count = 3 THEN
    RAISE NOTICE '✅ NF525: Les 3 triggers d''inaltérabilité sont actifs sur hash_chain';
  ELSE
    RAISE WARNING '⚠️ NF525: Seulement % triggers trouvés sur 3 attendus', trigger_count;
  END IF;
END $$;

-- Afficher les triggers actifs
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'hash_chain'
ORDER BY trigger_name;

COMMENT ON TABLE hash_chain IS
'Chaînage cryptographique NF525 - Hash SHA-256 immuable. ATTENTION: Cette table est PROTÉGÉE par des triggers. Aucune modification, suppression ou truncate n''est autorisée (décret n°2016-1551 anti-fraude TVA).';
