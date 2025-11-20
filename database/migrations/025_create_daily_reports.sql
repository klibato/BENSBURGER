-- ===============================================
-- MIGRATION 025: Créer table daily_reports (Rapport Z - NF525)
-- Date: 2025-11-20
-- Description: Rapports de clôture journalière (Z Report) conformes NF525
-- Obligation: Décret n°2016-1551 - Clôture quotidienne obligatoire
-- ===============================================

-- ===============================================
-- TABLE: daily_reports
-- ===============================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,

  -- Organisation (multi-tenant)
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Date du rapport (unique par organisation)
  report_date DATE NOT NULL,

  -- Totaux journaliers
  total_sales_count INTEGER NOT NULL DEFAULT 0 CHECK (total_sales_count >= 0),
  total_amount_ttc DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount_ttc >= 0),
  total_amount_ht DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount_ht >= 0),
  total_tax DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_tax >= 0),

  -- Détail par mode de paiement
  total_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_card DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_meal_voucher DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_mixed DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Détail TVA par taux
  vat_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Format: { "20.00": {"ht": 1000.00, "tva": 200.00, "ttc": 1200.00}, ... }

  -- Métadonnées période
  first_sale_time TIMESTAMP,
  last_sale_time TIMESTAMP,
  first_ticket_number VARCHAR(50),
  last_ticket_number VARCHAR(50),

  -- Hash chain NF525
  first_hash_sequence BIGINT,
  last_hash_sequence BIGINT,

  -- Signature NF525 (SHA-256)
  signature_hash VARCHAR(64) NOT NULL CHECK (length(signature_hash) = 64),

  -- Statut du rapport
  status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'verified', 'archived')),

  -- Métadonnées supplémentaires
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Contraintes
  CONSTRAINT uq_daily_report_org_date UNIQUE (organization_id, report_date),
  CONSTRAINT chk_hash_sequence CHECK (
    (first_hash_sequence IS NULL AND last_hash_sequence IS NULL) OR
    (first_hash_sequence IS NOT NULL AND last_hash_sequence IS NOT NULL AND last_hash_sequence >= first_hash_sequence)
  )
);

-- ===============================================
-- INDEXES
-- ===============================================
CREATE INDEX idx_daily_reports_org ON daily_reports(organization_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_org_date ON daily_reports(organization_id, report_date DESC);
CREATE INDEX idx_daily_reports_status ON daily_reports(status);
CREATE INDEX idx_daily_reports_created ON daily_reports(created_at DESC);

-- ===============================================
-- COMMENTAIRES
-- ===============================================
COMMENT ON TABLE daily_reports IS 'Rapports de clôture journalière (Z Report) - Conformité NF525 décret n°2016-1551';
COMMENT ON COLUMN daily_reports.report_date IS 'Date du rapport (unique par organisation)';
COMMENT ON COLUMN daily_reports.total_sales_count IS 'Nombre total de ventes de la journée';
COMMENT ON COLUMN daily_reports.signature_hash IS 'Hash SHA-256 calculé : SHA256(org_id|date|total_sales_count|total_amount_ttc|first_sequence|last_sequence)';
COMMENT ON COLUMN daily_reports.vat_breakdown IS 'Détail TVA par taux (format JSON: {"20.00": {"ht":X, "tva":Y, "ttc":Z}})';

-- ===============================================
-- TRIGGER: Immutabilité du rapport (NF525)
-- ===============================================
CREATE OR REPLACE FUNCTION prevent_daily_report_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Autoriser uniquement la modification du statut
  IF (
    (NEW.organization_id IS DISTINCT FROM OLD.organization_id) OR
    (NEW.report_date IS DISTINCT FROM OLD.report_date) OR
    (NEW.total_sales_count IS DISTINCT FROM OLD.total_sales_count) OR
    (NEW.total_amount_ttc IS DISTINCT FROM OLD.total_amount_ttc) OR
    (NEW.total_amount_ht IS DISTINCT FROM OLD.total_amount_ht) OR
    (NEW.total_tax IS DISTINCT FROM OLD.total_tax) OR
    (NEW.total_cash IS DISTINCT FROM OLD.total_cash) OR
    (NEW.total_card IS DISTINCT FROM OLD.total_card) OR
    (NEW.total_meal_voucher IS DISTINCT FROM OLD.total_meal_voucher) OR
    (NEW.total_mixed IS DISTINCT FROM OLD.total_mixed) OR
    (NEW.vat_breakdown::TEXT IS DISTINCT FROM OLD.vat_breakdown::TEXT) OR
    (NEW.first_sale_time IS DISTINCT FROM OLD.first_sale_time) OR
    (NEW.last_sale_time IS DISTINCT FROM OLD.last_sale_time) OR
    (NEW.first_ticket_number IS DISTINCT FROM OLD.first_ticket_number) OR
    (NEW.last_ticket_number IS DISTINCT FROM OLD.last_ticket_number) OR
    (NEW.first_hash_sequence IS DISTINCT FROM OLD.first_hash_sequence) OR
    (NEW.last_hash_sequence IS DISTINCT FROM OLD.last_hash_sequence) OR
    (NEW.signature_hash IS DISTINCT FROM OLD.signature_hash) OR
    (NEW.created_at IS DISTINCT FROM OLD.created_at) OR
    (NEW.created_by IS DISTINCT FROM OLD.created_by)
  ) THEN
    RAISE EXCEPTION 'NF525 Compliance: Daily reports are immutable. Only status can be updated.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_reports_immutable
BEFORE UPDATE ON daily_reports
FOR EACH ROW
EXECUTE FUNCTION prevent_daily_report_modification();

COMMENT ON FUNCTION prevent_daily_report_modification IS 'Trigger NF525: Empêche modification des rapports journaliers (seul statut modifiable)';

-- ===============================================
-- TRIGGER: Pas de suppression (NF525)
-- ===============================================
CREATE OR REPLACE FUNCTION prevent_daily_report_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NF525 Compliance: Daily reports cannot be deleted. Data retention required for 6 years.';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_reports_no_delete
BEFORE DELETE ON daily_reports
FOR EACH ROW
EXECUTE FUNCTION prevent_daily_report_deletion();

-- ===============================================
-- VUE: daily_reports_summary
-- ===============================================
CREATE OR REPLACE VIEW daily_reports_summary AS
SELECT
  dr.organization_id,
  o.name as organization_name,
  dr.report_date,
  dr.total_sales_count,
  dr.total_amount_ttc,
  dr.total_amount_ht,
  dr.total_tax,
  dr.total_cash,
  dr.total_card,
  dr.total_meal_voucher,
  dr.signature_hash,
  dr.status,
  dr.created_at,
  u.username as created_by_username
FROM daily_reports dr
INNER JOIN organizations o ON dr.organization_id = o.id
LEFT JOIN users u ON dr.created_by = u.id
ORDER BY dr.report_date DESC;

COMMENT ON VIEW daily_reports_summary IS 'Vue résumé des rapports journaliers avec infos organisation';

-- ===============================================
-- FONCTION: Générer rapport Z pour une date
-- ===============================================
CREATE OR REPLACE FUNCTION generate_daily_report(p_organization_id INTEGER, p_report_date DATE)
RETURNS TABLE(
  report_id INTEGER,
  total_sales INTEGER,
  total_ttc DECIMAL,
  signature VARCHAR
) AS $$
DECLARE
  v_report_id INTEGER;
  v_total_sales_count INTEGER;
  v_total_amount_ttc DECIMAL(12,2);
  v_total_amount_ht DECIMAL(12,2);
  v_total_tax DECIMAL(12,2);
  v_total_cash DECIMAL(12,2);
  v_total_card DECIMAL(12,2);
  v_total_meal_voucher DECIMAL(12,2);
  v_total_mixed DECIMAL(12,2);
  v_vat_breakdown JSONB;
  v_first_sale_time TIMESTAMP;
  v_last_sale_time TIMESTAMP;
  v_first_ticket VARCHAR(50);
  v_last_ticket VARCHAR(50);
  v_first_hash_seq BIGINT;
  v_last_hash_seq BIGINT;
  v_signature_hash VARCHAR(64);
BEGIN
  -- Vérifier si le rapport existe déjà
  IF EXISTS (SELECT 1 FROM daily_reports WHERE organization_id = p_organization_id AND report_date = p_report_date) THEN
    RAISE EXCEPTION 'Daily report already exists for date % and organization %', p_report_date, p_organization_id;
  END IF;

  -- Calculer les totaux des ventes de la journée
  SELECT
    COUNT(*),
    COALESCE(SUM(total_ttc), 0),
    COALESCE(SUM(total_ht), 0),
    COALESCE(SUM(total_ttc - total_ht), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_ttc ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_ttc ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'meal_voucher' THEN total_ttc ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'mixed' THEN total_ttc ELSE 0 END), 0),
    MIN(created_at),
    MAX(created_at),
    MIN(ticket_number),
    MAX(ticket_number)
  INTO
    v_total_sales_count,
    v_total_amount_ttc,
    v_total_amount_ht,
    v_total_tax,
    v_total_cash,
    v_total_card,
    v_total_meal_voucher,
    v_total_mixed,
    v_first_sale_time,
    v_last_sale_time,
    v_first_ticket,
    v_last_ticket
  FROM sales
  WHERE organization_id = p_organization_id
    AND DATE(created_at) = p_report_date
    AND status = 'completed';

  -- Récupérer les séquences hash
  SELECT MIN(sequence_number), MAX(sequence_number)
  INTO v_first_hash_seq, v_last_hash_seq
  FROM hash_chain hc
  INNER JOIN sales s ON hc.sale_id = s.id
  WHERE s.organization_id = p_organization_id
    AND DATE(s.created_at) = p_report_date;

  -- Calculer le hash SHA-256 du rapport
  v_signature_hash := encode(
    digest(
      p_organization_id::TEXT || '|' ||
      p_report_date::TEXT || '|' ||
      v_total_sales_count::TEXT || '|' ||
      v_total_amount_ttc::TEXT || '|' ||
      COALESCE(v_first_hash_seq::TEXT, '0') || '|' ||
      COALESCE(v_last_hash_seq::TEXT, '0'),
      'sha256'
    ),
    'hex'
  );

  -- Créer le rapport
  INSERT INTO daily_reports (
    organization_id,
    report_date,
    total_sales_count,
    total_amount_ttc,
    total_amount_ht,
    total_tax,
    total_cash,
    total_card,
    total_meal_voucher,
    total_mixed,
    vat_breakdown,
    first_sale_time,
    last_sale_time,
    first_ticket_number,
    last_ticket_number,
    first_hash_sequence,
    last_hash_sequence,
    signature_hash
  ) VALUES (
    p_organization_id,
    p_report_date,
    v_total_sales_count,
    v_total_amount_ttc,
    v_total_amount_ht,
    v_total_tax,
    v_total_cash,
    v_total_card,
    v_total_meal_voucher,
    v_total_mixed,
    '{}'::JSONB,
    v_first_sale_time,
    v_last_sale_time,
    v_first_ticket,
    v_last_ticket,
    v_first_hash_seq,
    v_last_hash_seq,
    v_signature_hash
  ) RETURNING id INTO v_report_id;

  -- Retourner le résultat
  RETURN QUERY SELECT v_report_id, v_total_sales_count, v_total_amount_ttc, v_signature_hash;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_daily_report IS 'Génère un rapport Z (clôture journalière) conforme NF525 pour une organisation et une date';

-- ===============================================
-- VÉRIFICATION
-- ===============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 025 terminée avec succès';
  RAISE NOTICE '   - Table daily_reports créée';
  RAISE NOTICE '   - Triggers immutabilité créés';
  RAISE NOTICE '   - Fonction generate_daily_report() créée';
  RAISE NOTICE '   - Vue daily_reports_summary créée';
  RAISE NOTICE '   - Conforme NF525 décret n°2016-1551';
  RAISE NOTICE '========================================';
END $$;
