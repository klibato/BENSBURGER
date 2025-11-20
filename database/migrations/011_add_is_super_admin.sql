-- Migration: Ajouter colonne is_super_admin à la table users
-- Date: 2024-11-20

BEGIN;

-- Ajouter la colonne is_super_admin
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Commenter la colonne
COMMENT ON COLUMN users.is_super_admin IS 'Super admin ayant accès à toutes les organisations';

COMMIT;
