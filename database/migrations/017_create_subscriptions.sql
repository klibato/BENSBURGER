-- Migration 017: Créer table subscriptions (SaaS)
-- Description: Historique des abonnements pour facturation
-- Date: 2025-11-18
-- PHASE 2.A

-- ============================================
-- TABLE: subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,

  -- Relation
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Abonnement
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'starter', 'premium', 'enterprise')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),

  -- Prix (en centimes pour éviter problèmes float)
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency VARCHAR(3) DEFAULT 'EUR' NOT NULL,
  billing_interval VARCHAR(20) DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),

  -- Dates importantes
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancelled_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Stripe/Paiement (pour future intégration)
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'card', 'sepa', 'bank_transfer'

  -- Métadonnées
  metadata JSONB DEFAULT '{}' NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(organization_id, status) WHERE status = 'active';

-- ============================================
-- TRIGGER: Mise à jour automatique updated_at
-- ============================================
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION: Créer subscription initiale pour orgs existantes
-- ============================================
-- Créer un abonnement "premium" actif pour l'organisation par défaut
INSERT INTO subscriptions (
  organization_id,
  plan,
  status,
  price_cents,
  currency,
  billing_interval,
  started_at,
  current_period_start,
  current_period_end
)
SELECT
  id AS organization_id,
  plan,
  'active' AS status,
  CASE
    WHEN plan = 'free' THEN 0
    WHEN plan = 'starter' THEN 2900  -- 29€
    WHEN plan = 'premium' THEN 4900  -- 49€
    WHEN plan = 'enterprise' THEN 9900  -- 99€
    ELSE 0
  END AS price_cents,
  'EUR' AS currency,
  'monthly' AS billing_interval,
  created_at AS started_at,
  CURRENT_TIMESTAMP AS current_period_start,
  CURRENT_TIMESTAMP + INTERVAL '1 month' AS current_period_end
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.organization_id = organizations.id
);

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE subscriptions IS 'Historique des abonnements SaaS par organisation';
COMMENT ON COLUMN subscriptions.organization_id IS 'Organisation liée à cet abonnement';
COMMENT ON COLUMN subscriptions.plan IS 'Plan: free, starter (29€), premium (49€), enterprise (99€)';
COMMENT ON COLUMN subscriptions.status IS 'Statut: active, cancelled, past_due (paiement échoué), trialing, expired';
COMMENT ON COLUMN subscriptions.price_cents IS 'Prix en centimes (ex: 2900 = 29.00€)';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Début de la période de facturation actuelle';
COMMENT ON COLUMN subscriptions.current_period_end IS 'Fin de la période (date de prochaine facturation)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'ID Stripe de l''abonnement (pour webhook sync)';
