-- Migration: Créer la table audit_logs
-- Date: 2025-11-15
-- Description: Table pour tracer toutes les actions importantes dans le système

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Commentaires
COMMENT ON TABLE audit_logs IS 'Journal d''audit de toutes les actions du système';
COMMENT ON COLUMN audit_logs.action IS 'Type d''action: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, OPEN_REGISTER, CLOSE_REGISTER, etc.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type d''entité: sale, product, user, cash_register, etc.';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID de l''entité affectée';
COMMENT ON COLUMN audit_logs.old_values IS 'Anciennes valeurs JSON (pour UPDATE)';
COMMENT ON COLUMN audit_logs.new_values IS 'Nouvelles valeurs JSON';
