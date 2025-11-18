-- Migration 018: Créer table invoices (SaaS)
-- Description: Facturation mensuelle des abonnements
-- Date: 2025-11-18
-- PHASE 2.B

-- ============================================
-- TABLE: invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,

  -- Relations
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Numérotation facture (séquentiel, obligatoire légalement)
  invoice_number VARCHAR(50) NOT NULL UNIQUE,

  -- Montants (en centimes)
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  currency VARCHAR(3) DEFAULT 'EUR' NOT NULL,

  -- TVA
  tax_rate DECIMAL(5, 2) DEFAULT 20.00 NOT NULL, -- TVA française 20%

  -- Statut paiement
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  paid_at TIMESTAMP,

  -- Période de facturation
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Dates limites
  due_date DATE NOT NULL,

  -- Stripe/Paiement
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'card', 'sepa', 'bank_transfer'

  -- Fichier PDF
  pdf_url TEXT,

  -- Métadonnées
  metadata JSONB DEFAULT '{}' NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_period_end ON invoices(period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON invoices(status, due_date) WHERE status IN ('open', 'uncollectible');

-- ============================================
-- TRIGGER: Mise à jour automatique updated_at
-- ============================================
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FONCTION: Générer numéro de facture séquentiel
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);

  -- Trouver le prochain numéro pour l'année en cours
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '\\d+$') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';

  -- Format: INV-2025-00001
  invoice_num := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-générer invoice_number si vide
-- ============================================
CREATE OR REPLACE FUNCTION trg_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_generate_number
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION trg_generate_invoice_number();

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE invoices IS 'Factures mensuelles pour abonnements SaaS';
COMMENT ON COLUMN invoices.invoice_number IS 'Numéro de facture séquentiel (ex: INV-2025-00001)';
COMMENT ON COLUMN invoices.subtotal_cents IS 'Montant HT en centimes';
COMMENT ON COLUMN invoices.tax_cents IS 'Montant TVA en centimes';
COMMENT ON COLUMN invoices.total_cents IS 'Montant TTC en centimes (subtotal + tax)';
COMMENT ON COLUMN invoices.status IS 'draft (brouillon), open (envoyée), paid (payée), void (annulée), uncollectible (impayée)';
COMMENT ON COLUMN invoices.due_date IS 'Date limite de paiement (généralement +30 jours)';
COMMENT ON COLUMN invoices.period_start IS 'Début de la période facturée';
COMMENT ON COLUMN invoices.period_end IS 'Fin de la période facturée';
