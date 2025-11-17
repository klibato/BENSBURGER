-- Migration: Ajouter les colonnes discount à la table sales
-- Date: 2025-11-16
-- Description: Support des réductions/remises sur les ventes

-- Ajouter les colonnes de discount
DO $$
BEGIN
    -- Discount Type (percentage ou amount)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'discount_type'
    ) THEN
        ALTER TABLE sales ADD COLUMN discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'amount'));
        COMMENT ON COLUMN sales.discount_type IS 'Type de remise: percentage (%) ou amount (€)';
    END IF;

    -- Discount Value (valeur de la remise: 10% ou 5€)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'discount_value'
    ) THEN
        ALTER TABLE sales ADD COLUMN discount_value DECIMAL(10, 2);
        COMMENT ON COLUMN sales.discount_value IS 'Valeur de la remise (pourcentage ou montant)';
    END IF;

    -- Discount Amount (montant final de la remise en €)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE sales ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN sales.discount_amount IS 'Montant de la remise appliquée (en €)';
    END IF;

END $$;

-- Créer un index sur les ventes avec remise
CREATE INDEX IF NOT EXISTS idx_sales_discount
ON sales(discount_type, discount_amount)
WHERE discount_amount > 0;

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Migration 013: Discount fields added successfully to sales table';
END $$;
