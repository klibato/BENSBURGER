-- Migration 019: Créer table admin_users (Super-Admin)
-- Description: Utilisateurs super-admin séparés des users normaux (multi-organisations)
-- Date: 2025-11-18
-- PHASE 2.C

-- ============================================
-- TABLE: admin_users
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,

  -- Identification
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash

  -- Profil
  first_name VARCHAR(100),
  last_name VARCHAR(100),

  -- Rôle super-admin
  role VARCHAR(50) DEFAULT 'admin' NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),

  -- Permissions granulaires (JSONB pour flexibilité)
  permissions JSONB DEFAULT '[]' NOT NULL,
  -- Exemple: ["organizations:read", "organizations:write", "subscriptions:manage", "invoices:read"]

  -- Activation
  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Sécurité
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(50),
  email_verified BOOLEAN DEFAULT false NOT NULL,
  email_verified_at TIMESTAMP,

  -- Réinitialisation mot de passe
  reset_token VARCHAR(255),
  reset_token_expires_at TIMESTAMP,

  -- 2FA (future)
  two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
  two_factor_secret VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_deleted_at ON admin_users(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- TRIGGER: Mise à jour automatique updated_at
-- ============================================
CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED: Créer admin par défaut (mot de passe: Admin@2025)
-- ============================================
-- Hash bcrypt de "Admin@2025" (10 rounds)
-- NOTE: À CHANGER EN PRODUCTION !
INSERT INTO admin_users (
  email,
  username,
  password_hash,
  first_name,
  last_name,
  role,
  permissions,
  is_active,
  email_verified
) VALUES (
  'admin@flexpos.app',
  'superadmin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564BbYKlJ6EqLHBk8KrGwv/wC5K', -- "Admin@2025"
  'Super',
  'Admin',
  'super_admin',
  '["*"]'::jsonb, -- Toutes les permissions
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE admin_users IS 'Utilisateurs super-admin (accès multi-organisations)';
COMMENT ON COLUMN admin_users.email IS 'Email de connexion (unique)';
COMMENT ON COLUMN admin_users.username IS 'Username de connexion (unique)';
COMMENT ON COLUMN admin_users.password_hash IS 'Hash bcrypt du mot de passe (10 rounds minimum)';
COMMENT ON COLUMN admin_users.role IS 'Rôle: super_admin (tous pouvoirs), admin (gestion), support (lecture seule)';
COMMENT ON COLUMN admin_users.permissions IS 'Permissions granulaires (array JSON): ["organizations:read", "subscriptions:manage", etc.]';
COMMENT ON COLUMN admin_users.is_active IS 'Compte actif (false = suspendu)';
COMMENT ON COLUMN admin_users.email_verified IS 'Email vérifié (obligatoire pour connexion)';
