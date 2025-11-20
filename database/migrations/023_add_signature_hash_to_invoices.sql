-- ===============================================
-- MIGRATION 023: Ajouter signature_hash aux factures (NF525)
-- Date: 2025-11-20
-- Description: Ajout du champ signature_hash pour conformité NF525
-- Impact: Permet de garantir l'intégrité des factures SaaS
-- ===============================================

-- Ajouter colonne signature_hash
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64)
CHECK (length(signature_hash) = 64);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_invoices_signature_hash
ON invoices(signature_hash) WHERE signature_hash IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN invoices.signature_hash IS 'Hash SHA-256 NF525 pour garantir l''intégrité de la facture (organisation_id|invoice_number|total_cents|period_start|period_end)';

-- ===============================================
-- TRIGGER: Bloquer modification des données fiscales
-- ===============================================
CREATE OR REPLACE FUNCTION prevent_invoice_fiscal_data_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Autoriser uniquement la modification de status, paid_at, payment_method, pdf_url, metadata
  IF (
    (NEW.invoice_number IS DISTINCT FROM OLD.invoice_number) OR
    (NEW.organization_id IS DISTINCT FROM OLD.organization_id) OR
    (NEW.subscription_id IS DISTINCT FROM OLD.subscription_id) OR
    (NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents) OR
    (NEW.tax_cents IS DISTINCT FROM OLD.tax_cents) OR
    (NEW.total_cents IS DISTINCT FROM OLD.total_cents) OR
    (NEW.currency IS DISTINCT FROM OLD.currency) OR
    (NEW.tax_rate IS DISTINCT FROM OLD.tax_rate) OR
    (NEW.period_start IS DISTINCT FROM OLD.period_start) OR
    (NEW.period_end IS DISTINCT FROM OLD.period_end) OR
    (NEW.due_date IS DISTINCT FROM OLD.due_date) OR
    (NEW.signature_hash IS DISTINCT FROM OLD.signature_hash)
  ) THEN
    RAISE EXCEPTION 'NF525 Compliance: Cannot modify fiscal data of invoice. Only status, paid_at, payment_method, pdf_url, and metadata can be updated.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_prevent_fiscal_modification
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_invoice_fiscal_data_modification();

COMMENT ON FUNCTION prevent_invoice_fiscal_data_modification IS 'Trigger NF525: Empêche modification des données fiscales des factures';

-- ===============================================
-- BACKFILL: Calculer hash pour factures existantes
-- ===============================================
DO $$
DECLARE
  invoice_record RECORD;
  calculated_hash VARCHAR(64);
BEGIN
  FOR invoice_record IN
    SELECT id, organization_id, invoice_number, total_cents, period_start, period_end
    FROM invoices
    WHERE signature_hash IS NULL
  LOOP
    -- Calculer le hash SHA-256
    calculated_hash := encode(
      digest(
        invoice_record.invoice_number || '|' ||
        invoice_record.organization_id::TEXT || '|' ||
        invoice_record.total_cents::TEXT || '|' ||
        invoice_record.period_start::TEXT || '|' ||
        invoice_record.period_end::TEXT,
        'sha256'
      ),
      'hex'
    );

    -- Mettre à jour (via UPDATE direct qui bypass le trigger pour cette migration)
    UPDATE invoices
    SET signature_hash = calculated_hash
    WHERE id = invoice_record.id;
  END LOOP;

  RAISE NOTICE '✅ Signature hash calculé pour % factures existantes', (SELECT COUNT(*) FROM invoices);
END $$;

-- ===============================================
-- VÉRIFICATION
-- ===============================================
DO $$
DECLARE
  total_invoices INTEGER;
  invoices_with_hash INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_invoices FROM invoices;
  SELECT COUNT(*) INTO invoices_with_hash FROM invoices WHERE signature_hash IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 023 terminée avec succès';
  RAISE NOTICE '   - Colonne signature_hash ajoutée';
  RAISE NOTICE '   - Trigger immutabilité créé';
  RAISE NOTICE '   - % factures avec hash : %/%', invoices_with_hash, invoices_with_hash, total_invoices;
  RAISE NOTICE '========================================';
END $$;
