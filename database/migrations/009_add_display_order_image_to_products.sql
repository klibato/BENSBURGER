-- Migration: Ajouter display_order et image_url aux produits
-- Description: Ordre d'affichage personnalisable et images produits

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
