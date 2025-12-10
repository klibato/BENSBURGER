-- Migration 015: Ajouter organization_id à toutes les tables (Multi-Tenant)
-- Description: Ajoute la colonne organization_id pour l'isolation multi-tenant
-- Date: 2025-11-16
-- PHASE 1.A

-- ============================================
-- 1. USERS
-- ============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active) WHERE is_active = TRUE;

COMMENT ON COLUMN users.organization_id IS 'Organisation à laquelle l''utilisateur appartient';

-- ============================================
-- 2. PRODUCTS
-- ============================================
ALTER TABLE products
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_org_menu ON products(organization_id, is_menu) WHERE deleted_at IS NULL;

COMMENT ON COLUMN products.organization_id IS 'Organisation propriétaire du produit';

-- ============================================
-- 3. MENU_COMPOSITIONS
-- ============================================
ALTER TABLE menu_compositions
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_menu_compositions_organization_id ON menu_compositions(organization_id);
CREATE INDEX IF NOT EXISTS idx_menu_compositions_org_menu ON menu_compositions(organization_id, menu_id);

COMMENT ON COLUMN menu_compositions.organization_id IS 'Organisation propriétaire de la composition';

-- ============================================
-- 4. CASH_REGISTERS
-- ============================================
ALTER TABLE cash_registers
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cash_registers_organization_id ON cash_registers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_org_status ON cash_registers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_org_date ON cash_registers(organization_id, opened_at);
CREATE INDEX IF NOT EXISTS idx_cash_registers_org_open ON cash_registers(organization_id, opened_by, status) WHERE status = 'open';

COMMENT ON COLUMN cash_registers.organization_id IS 'Organisation à laquelle appartient la caisse';

-- ============================================
-- 5. SALES
-- ============================================
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_org_status ON sales(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_org_cash_register ON sales(organization_id, cash_register_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_today ON sales(organization_id, created_at, status) WHERE status = 'completed';

COMMENT ON COLUMN sales.organization_id IS 'Organisation à laquelle appartient la vente';

-- ============================================
-- 6. SALE_ITEMS
-- ============================================
ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sale_items_organization_id ON sale_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org_sale ON sale_items(organization_id, sale_id);

COMMENT ON COLUMN sale_items.organization_id IS 'Organisation à laquelle appartient la ligne de vente';

-- ============================================
-- 7. AUDIT_LOGS
-- ============================================
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user ON audit_logs(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date ON audit_logs(organization_id, created_at);

COMMENT ON COLUMN audit_logs.organization_id IS 'Organisation à laquelle appartient le log d''audit';

-- ============================================
-- SUPPRESSION DES DEFAULT (Important!)
-- ============================================
-- Le DEFAULT 1 est uniquement pour la migration des données existantes.
-- On le supprime pour forcer l'application à TOUJOURS spécifier organization_id.

ALTER TABLE users ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE products ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE menu_compositions ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE cash_registers ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE sales ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE sale_items ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE audit_logs ALTER COLUMN organization_id DROP DEFAULT;

-- ============================================
-- VÉRIFICATIONS
-- ============================================
-- Compter les enregistrements par table (doivent tous avoir organization_id = 1)
DO $$
DECLARE
  user_count INTEGER;
  product_count INTEGER;
  sale_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE organization_id = 1;
  SELECT COUNT(*) INTO product_count FROM products WHERE organization_id = 1;
  SELECT COUNT(*) INTO sale_count FROM sales WHERE organization_id = 1;

  RAISE NOTICE 'Migration 015 completed:';
  RAISE NOTICE '  - Users migrated to org 1: %', user_count;
  RAISE NOTICE '  - Products migrated to org 1: %', product_count;
  RAISE NOTICE '  - Sales migrated to org 1: %', sale_count;
END $$;
