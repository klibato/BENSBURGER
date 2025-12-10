-- ============================================
-- Migration 032: Create refresh_tokens table
-- ✅ P1-6: JWT Refresh Tokens (Sécurité)
-- ============================================
--
-- Description:
--   Table pour stocker les refresh tokens JWT
--   - Permet de générer de nouveaux access tokens sans re-authentification
--   - Tokens long-lived (7 jours) avec révocation possible
--   - Support de la rotation de tokens (replaced_by_token)
--
-- Sécurité:
--   - Tokens cryptographiquement sécurisés (64 bytes random)
--   - Expiration automatique
--   - Révocation manuelle possible
--   - Nettoyage automatique des tokens expirés
--
-- Author: Claude (P1-6 Security Audit)
-- Date: 2025-12-07
-- ============================================

-- Créer la table refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,

  -- Token unique (64 bytes random hex = 128 chars)
  token VARCHAR(255) NOT NULL UNIQUE,

  -- Relations
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Expiration et révocation
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,

  -- Token rotation (optionnel)
  replaced_by_token VARCHAR(255) NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Index pour performances
  INDEX idx_refresh_tokens_token (token),
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_organization_id (organization_id),
  INDEX idx_refresh_tokens_expires_at (expires_at)
);

-- Commentaires sur la table
COMMENT ON TABLE refresh_tokens IS '✅ P1-6: Tokens de rafraîchissement JWT pour renouveler les access tokens';
COMMENT ON COLUMN refresh_tokens.token IS 'Token unique généré avec crypto.randomBytes(64)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Date d''expiration du token (par défaut 7 jours)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Date de révocation manuelle du token (logout, changement password, etc.)';
COMMENT ON COLUMN refresh_tokens.replaced_by_token IS 'Token de remplacement en cas de rotation (optionnel)';
