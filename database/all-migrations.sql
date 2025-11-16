-- ============================================
-- BENSBURGER POS - TOUTES LES MIGRATIONS SQL CONSOLIDÉES
-- ============================================
-- Ce fichier combine toutes les migrations SQL dans l'ordre chronologique
-- Il est généré automatiquement et sert de documentation
-- Pour appliquer les migrations automatiquement, utilisez: npm run db:migrate
-- ============================================

-- ============================================
-- MIGRATION 001: Améliorer la table cash_registers
-- Date: 2025-11-10
-- ============================================

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
COMMENT ON COLUMN cash_registers.user_id IS 'DEPRECATED: Use opened_by instead';

-- ============================================
-- MIGRATION 008: Création de la table store_settings
-- ============================================

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  store_name VARCHAR(255) NOT NULL DEFAULT 'BensBurger',
  store_description VARCHAR(255) DEFAULT 'Restaurant Rapide',
  address_line1 VARCHAR(255) DEFAULT '123 Avenue des Burgers',
  address_line2 VARCHAR(255) DEFAULT NULL,
  postal_code VARCHAR(10) DEFAULT '75001',
  city VARCHAR(100) DEFAULT 'Paris',
  country VARCHAR(100) DEFAULT 'France',
  phone VARCHAR(20) DEFAULT '01 23 45 67 89',
  email VARCHAR(255) DEFAULT NULL,
  website VARCHAR(255) DEFAULT NULL,

  -- Informations légales
  legal_form VARCHAR(50) DEFAULT 'SARL', -- SARL, SAS, EURL, etc.
  capital_amount DECIMAL(10, 2) DEFAULT 10000.00,
  siret VARCHAR(14) DEFAULT '12345678900012',
  vat_number VARCHAR(20) DEFAULT 'FR12345678901',
  rcs VARCHAR(100) DEFAULT 'Paris B 123 456 789',

  -- Paramètres généraux
  currency VARCHAR(3) DEFAULT 'EUR',
  currency_symbol VARCHAR(5) DEFAULT '€',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Contrainte: une seule ligne de paramètres
  CONSTRAINT single_row_settings CHECK (id = 1)
);

-- Insérer les paramètres par défaut
INSERT INTO store_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_store_settings_id ON store_settings(id);

-- Commentaires
COMMENT ON TABLE store_settings IS 'Paramètres globaux du commerce (nom, adresse, infos légales)';
COMMENT ON COLUMN store_settings.id IS 'ID fixe à 1 pour garantir une seule ligne de paramètres';
COMMENT ON COLUMN store_settings.siret IS 'Numéro SIRET (14 chiffres)';
COMMENT ON COLUMN store_settings.vat_number IS 'Numéro de TVA intracommunautaire';
COMMENT ON COLUMN store_settings.rcs IS 'Immatriculation RCS (Registre du Commerce et des Sociétés)';

-- ============================================
-- MIGRATION 009: Ajouter display_order et image_url aux produits
-- ============================================

-- Ajouter display_order (ordre d'affichage)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Ajouter image_url (chemin ou URL de l'image)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

-- Mettre à jour les display_order existants (ordre par id)
UPDATE products
SET display_order = id
WHERE display_order = 0;

-- Créer un index sur display_order pour optimiser le tri
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- Créer un index sur image_url pour les requêtes avec images
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url);

-- Commentaires
COMMENT ON COLUMN products.display_order IS 'Ordre d''affichage du produit dans l''interface (plus petit = en premier)';
COMMENT ON COLUMN products.image_url IS 'URL ou chemin de l''image du produit';

-- ============================================
-- MIGRATION 010: Ajouter les champs de gestion du stock
-- Date: 2025-11-16
-- ============================================

-- Add quantity column (current stock level)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0);
        COMMENT ON COLUMN products.quantity IS 'Quantité en stock';
    END IF;
END $$;

-- Add low_stock_threshold column (alert threshold)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'low_stock_threshold'
    ) THEN
        ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0);
        COMMENT ON COLUMN products.low_stock_threshold IS 'Seuil d''alerte stock bas';
    END IF;
END $$;

-- Create index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_low_stock
ON products(quantity, low_stock_threshold)
WHERE quantity <= low_stock_threshold AND is_active = true AND deleted_at IS NULL;

-- ============================================
-- MIGRATION 011: Mettre à jour la contrainte audit_logs actions
-- Date: 2025-11-16
-- ============================================

-- Drop the old constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Add the new constraint with all actions used in the application
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
CHECK (action IN (
    -- Standard CRUD operations
    'CREATE',
    'UPDATE',
    'DELETE',
    -- Authentication actions
    'LOGIN',
    'LOGOUT',
    'SWITCH_CASHIER',
    -- Cash register actions
    'OPEN_REGISTER',
    'CLOSE_REGISTER',
    -- Sales actions
    'SALE',
    'CANCEL_SALE',
    'REFUND_SALE',
    -- Product/Inventory actions
    'STOCK_INCREMENT',
    'STOCK_DECREMENT',
    -- Settings actions
    'UPDATE_SETTINGS',
    -- Generic action for backward compatibility
    'ACTION'
));

-- ============================================
-- FIN DES MIGRATIONS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Toutes les migrations SQL ont été appliquées avec succès';
END $$;
