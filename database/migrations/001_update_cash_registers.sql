-- Migration: Améliorer la table cash_registers
-- Date: 2025-11-10

-- Ajouter les nouvelles colonnes
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS register_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS opened_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Renommer les colonnes existantes pour plus de clarté
ALTER TABLE cash_registers
  RENAME COLUMN opening_amount TO opening_balance;

ALTER TABLE cash_registers
  RENAME COLUMN closing_amount TO closing_balance;

ALTER TABLE cash_registers
  RENAME COLUMN actual_cash TO counted_cash;

ALTER TABLE cash_registers
  RENAME COLUMN expected_cash TO expected_balance;

ALTER TABLE cash_registers
  RENAME COLUMN cash_difference TO difference;

-- Ajouter une colonne pour le total espèces collectées
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS total_cash_collected DECIMAL(10, 2) DEFAULT 0;

-- Migrer les données existantes: copier user_id vers opened_by
UPDATE cash_registers SET opened_by = user_id WHERE opened_by IS NULL;

-- Mettre register_name par défaut pour les caisses existantes
UPDATE cash_registers
SET register_name = 'Caisse ' || id
WHERE register_name IS NULL;

-- Rendre opened_by NOT NULL
ALTER TABLE cash_registers
  ALTER COLUMN opened_by SET NOT NULL;

-- Rendre register_name NOT NULL
ALTER TABLE cash_registers
  ALTER COLUMN register_name SET NOT NULL;

-- On garde user_id pour compatibilité mais il n'est plus utilisé
-- (ou on peut le supprimer si on veut nettoyer)
COMMENT ON COLUMN cash_registers.user_id IS 'DEPRECATED: Use opened_by instead';
