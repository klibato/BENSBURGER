-- Migration: Ajouter colonne suspension_reason à la table organizations
-- Date: 2024-11-20

BEGIN;

-- Ajouter la colonne suspension_reason
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Commenter la colonne
COMMENT ON COLUMN organizations.suspension_reason IS 'Raison de la suspension (si applicable)';

COMMIT;
