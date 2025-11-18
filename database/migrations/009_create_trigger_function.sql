-- Migration 009: Créer fonction trigger update_updated_at_column()
-- Description: Fonction utilisée par tous les triggers pour mettre à jour updated_at
-- Date: 2025-11-18

-- ============================================
-- FUNCTION: update_updated_at_column()
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';
