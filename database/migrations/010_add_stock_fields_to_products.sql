-- Migration: Add stock management fields to products table
-- Date: 2025-11-16
-- Description: Add quantity and low_stock_threshold columns for inventory tracking

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

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Migration 010: Stock fields added successfully to products table';
END $$;
