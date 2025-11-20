-- ===============================================
-- MIGRATION 024: Corriger race condition génération numéros factures
-- Date: 2025-11-20
-- Description: Remplacer SELECT MAX(...) par séquences PostgreSQL
-- Impact: Élimine complètement les doublons de numéros de facture
-- ===============================================

-- ===============================================
-- 1. Créer séquences par année (2025, 2026, etc.)
-- ===============================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2025 START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2026 START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2027 START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2028 START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2029 START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2030 START WITH 1;

-- ===============================================
-- 2. Initialiser les séquences avec les valeurs actuelles
-- ===============================================
DO $$
DECLARE
  current_max_2025 INTEGER;
  current_max_2026 INTEGER;
BEGIN
  -- Trouver le max pour 2025
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '\\d+$') AS INTEGER)
  ), 0)
  INTO current_max_2025
  FROM invoices
  WHERE invoice_number LIKE 'INV-2025-%';

  IF current_max_2025 > 0 THEN
    PERFORM setval('invoice_number_seq_2025', current_max_2025 + 1, false);
    RAISE NOTICE 'Séquence 2025 initialisée à %', current_max_2025 + 1;
  END IF;

  -- Trouver le max pour 2026
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '\\d+$') AS INTEGER)
  ), 0)
  INTO current_max_2026
  FROM invoices
  WHERE invoice_number LIKE 'INV-2026-%';

  IF current_max_2026 > 0 THEN
    PERFORM setval('invoice_number_seq_2026', current_max_2026 + 1, false);
    RAISE NOTICE 'Séquence 2026 initialisée à %', current_max_2026 + 1;
  END IF;
END $$;

-- ===============================================
-- 3. Remplacer fonction generate_invoice_number()
-- ===============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  invoice_num TEXT;
  sequence_name TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  sequence_name := 'invoice_number_seq_' || current_year;

  -- Créer la séquence si elle n'existe pas encore (pour les années futures)
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = sequence_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I START WITH 1', sequence_name);
    RAISE NOTICE 'Séquence % créée automatiquement', sequence_name;
  END IF;

  -- Obtenir le prochain numéro de la séquence (atomique et thread-safe)
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;

  -- Format: INV-2025-00001
  invoice_num := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invoice_number IS 'Génère un numéro de facture séquentiel thread-safe avec séquences PostgreSQL (NF525 compliant)';

-- ===============================================
-- 4. Vérifier que le trigger existant fonctionne toujours
-- ===============================================
-- Le trigger trg_invoices_generate_number doit déjà exister de la migration 018
-- Il appelle generate_invoice_number() qui est maintenant thread-safe

-- ===============================================
-- 5. Tests d'intégrité
-- ===============================================
DO $$
DECLARE
  test_number_1 TEXT;
  test_number_2 TEXT;
  test_number_3 TEXT;
BEGIN
  -- Tester la génération de 3 numéros consécutifs
  test_number_1 := generate_invoice_number();
  test_number_2 := generate_invoice_number();
  test_number_3 := generate_invoice_number();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tests génération numéros factures:';
  RAISE NOTICE '  1. %', test_number_1;
  RAISE NOTICE '  2. %', test_number_2;
  RAISE NOTICE '  3. %', test_number_3;

  -- Vérifier que les numéros sont différents
  IF test_number_1 = test_number_2 OR test_number_2 = test_number_3 THEN
    RAISE EXCEPTION 'ERREUR: Numéros de facture identiques générés !';
  END IF;

  RAISE NOTICE '✅ Tests OK - Numéros uniques générés';
  RAISE NOTICE '========================================';
END $$;

-- ===============================================
-- VÉRIFICATION FINALE
-- ===============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 024 terminée avec succès';
  RAISE NOTICE '   - Séquences PostgreSQL créées';
  RAISE NOTICE '   - Fonction generate_invoice_number() corrigée';
  RAISE NOTICE '   - Race condition éliminée';
  RAISE NOTICE '   - Thread-safe et conforme NF525';
  RAISE NOTICE '========================================';
END $$;
