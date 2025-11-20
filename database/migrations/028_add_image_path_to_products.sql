-- ===============================================
-- MIGRATION 028: Ajouter image_path aux produits
-- Date: 2025-11-20
-- Description: Permet de stocker le chemin de l'image produit localement
-- ===============================================

-- Ajouter colonne image_path
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);

-- Index pour recherche rapide (optionnel)
CREATE INDEX IF NOT EXISTS idx_products_with_image
ON products(image_path) WHERE image_path IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN products.image_path IS 'Chemin relatif de l''image produit stockée localement (ex: uploads/products/abc123.jpg)';

-- ===============================================
-- VÉRIFICATION
-- ===============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 028 terminée avec succès';
  RAISE NOTICE '   - Colonne image_path ajoutée à products';
  RAISE NOTICE '   - Index idx_products_with_image créé';
  RAISE NOTICE '========================================';
END $$;
