-- ============================================
-- FlexPOS POS - Database Initialization
-- ============================================

-- Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (Utilisateurs/Caissiers)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    pin_code VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cashier')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- TABLE: products (Produits)
-- ============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_ht DECIMAL(10, 2) NOT NULL,
    vat_rate DECIMAL(4, 2) NOT NULL CHECK (vat_rate IN (5.5, 10.0, 20.0)),
    category VARCHAR(50) NOT NULL CHECK (category IN ('burgers', 'sides', 'drinks', 'desserts', 'menus')),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_menu BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_menu ON products(is_menu);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_active_category ON products(category, is_active, display_order) WHERE deleted_at IS NULL;

-- ============================================
-- TABLE: menu_compositions (Composition des menus)
-- ============================================
CREATE TABLE menu_compositions (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_compositions_menu_id ON menu_compositions(menu_id);
CREATE INDEX idx_menu_compositions_product_id ON menu_compositions(product_id);

-- ============================================
-- TABLE: cash_registers (Caisses)
-- ============================================
CREATE TABLE cash_registers (
    id SERIAL PRIMARY KEY,
    register_name VARCHAR(100) NOT NULL,
    opened_by INTEGER NOT NULL REFERENCES users(id),
    closed_by INTEGER REFERENCES users(id),
    opening_balance DECIMAL(10, 2) NOT NULL,
    closing_balance DECIMAL(10, 2),
    expected_balance DECIMAL(10, 2),
    counted_cash DECIMAL(10, 2),
    difference DECIMAL(10, 2),
    total_cash_collected DECIMAL(10, 2) DEFAULT 0,
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_cash DECIMAL(10, 2) DEFAULT 0,
    total_card DECIMAL(10, 2) DEFAULT 0,
    total_meal_voucher DECIMAL(10, 2) DEFAULT 0,
    ticket_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closing_report JSONB,
    closing_hash VARCHAR(64),
    notes TEXT,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    user_id INTEGER -- DEPRECATED: kept for compatibility
);

CREATE INDEX idx_cash_registers_opened_by ON cash_registers(opened_by);
CREATE INDEX idx_cash_registers_closed_by ON cash_registers(closed_by);
CREATE INDEX idx_cash_registers_status ON cash_registers(status);
CREATE INDEX idx_cash_registers_opened_at ON cash_registers(opened_at);
CREATE INDEX idx_cash_register_open ON cash_registers(opened_by, status) WHERE status = 'open';

-- ============================================
-- TABLE: sales (Ventes)
-- ============================================
CREATE SEQUENCE ticket_number_seq START 1;

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total_ht DECIMAL(10, 2) NOT NULL,
    total_ttc DECIMAL(10, 2) NOT NULL,
    vat_details JSONB NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'meal_voucher', 'mixed')),
    payment_details JSONB,
    amount_paid DECIMAL(10, 2) NOT NULL,
    change_given DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    cash_register_id INTEGER REFERENCES cash_registers(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_sales_ticket_number ON sales(ticket_number);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sales_cash_register_id ON sales(cash_register_id);
CREATE INDEX idx_sales_today ON sales(created_at, status) WHERE status = 'completed';

-- Trigger pour générer automatiquement le numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_ticket_number
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- ============================================
-- TABLE: sale_items (Lignes de vente)
-- ============================================
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_ht DECIMAL(10, 2) NOT NULL,
    vat_rate DECIMAL(4, 2) NOT NULL,
    total_ht DECIMAL(10, 2) NOT NULL,
    total_ttc DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- ============================================
-- TABLE: audit_logs (Traçabilité)
-- ============================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- TRIGGERS: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Fin de l'initialisation
-- ============================================
