-- Migration 014: Créer table organizations (Multi-Tenant)
-- Description: Table principale pour gérer les organisations/commerces
-- Date: 2025-11-16
-- PHASE 1.A

-- ============================================
-- TABLE: organizations
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,

  -- Identification
  name VARCHAR(255) NOT NULL,                    -- "FlexPOS Paris"
  slug VARCHAR(100) NOT NULL UNIQUE,             -- "flexpos-paris" (subdomain)
  domain VARCHAR(255) UNIQUE,                    -- "flexpos.com" (custom domain)

  -- Contact
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Paramètres métier (migré depuis store_settings)
  settings JSONB DEFAULT '{}' NOT NULL,

  -- Abonnement SaaS
  plan VARCHAR(50) DEFAULT 'free' NOT NULL CHECK (plan IN ('free', 'starter', 'premium', 'enterprise')),
  status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,

  -- Limites par plan
  max_users INTEGER DEFAULT 3 NOT NULL CHECK (max_users >= 1),
  max_products INTEGER DEFAULT 50 NOT NULL CHECK (max_products >= 1),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(status, deleted_at) WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================
-- MIGRATION DES DONNÉES EXISTANTES
-- ============================================
-- Créer organisation par défaut "FlexPOS" depuis store_settings
INSERT INTO organizations (
  id,
  name,
  slug,
  email,
  phone,
  settings,
  plan,
  status,
  max_users,
  max_products,
  created_at
)
SELECT
  1 AS id,
  COALESCE(store_name, 'FlexPOS') AS name,
  'flexpos' AS slug,
  email,
  phone,
  jsonb_build_object(
    'store_description', store_description,
    'address_line1', address_line1,
    'address_line2', address_line2,
    'postal_code', postal_code,
    'city', city,
    'country', country,
    'legal_form', legal_form,
    'capital_amount', capital_amount,
    'siret', siret,
    'vat_number', vat_number,
    'rcs', rcs,
    'currency', currency,
    'currency_symbol', currency_symbol,
    'categories', COALESCE(categories, '[]'::jsonb),
    'vat_rates', COALESCE(vat_rates, '[]'::jsonb),
    'payment_methods', COALESCE(payment_methods, '{}'::jsonb),
    'theme_color', COALESCE(theme_color, '#FF6B35'),
    'logo_url', logo_url,
    'language', COALESCE(language, 'fr-FR'),
    'timezone', COALESCE(timezone, 'Europe/Paris'),
    'sumup_config', COALESCE(sumup_config, '{}'::jsonb),
    'printer_config', COALESCE(printer_config, '{}'::jsonb),
    'email_config', COALESCE(email_config, '{}'::jsonb)
  ) AS settings,
  'premium' AS plan,
  'active' AS status,
  999 AS max_users,
  999 AS max_products,
  COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at
FROM store_settings
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

-- Si store_settings n'existe pas ou est vide, créer organisation par défaut simple
INSERT INTO organizations (id, name, slug, plan, status, max_users, max_products)
SELECT 1, 'FlexPOS', 'flexpos', 'premium', 'active', 999, 999
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 1);

-- ============================================
-- TRIGGER: Mise à jour automatique updated_at
-- ============================================
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE organizations IS 'Organisations/commerces multi-tenant - chaque restaurant a son propre espace';
COMMENT ON COLUMN organizations.slug IS 'Slug unique pour sous-domaine (ex: flexpos.app.com)';
COMMENT ON COLUMN organizations.domain IS 'Domaine personnalisé optionnel (ex: flexpos.com)';
COMMENT ON COLUMN organizations.settings IS 'Paramètres métier (adresse, infos légales, configs)';
COMMENT ON COLUMN organizations.plan IS 'Plan SaaS: free (3 users, 50 products), starter, premium, enterprise';
COMMENT ON COLUMN organizations.status IS 'Statut: active, suspended (paiement), cancelled';
COMMENT ON COLUMN organizations.max_users IS 'Limite utilisateurs selon le plan';
COMMENT ON COLUMN organizations.max_products IS 'Limite produits selon le plan';
