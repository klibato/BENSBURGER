# Schéma de Base de Données - POS Burger

## 🗄️ Vue d'ensemble

Base de données PostgreSQL optimisée pour performances et conformité légale (pré-NF525).

## 📊 Diagramme ER (Entity-Relationship)

```
┌─────────────┐         ┌──────────────┐
│    users    │────────<│    sales     │
└─────────────┘    1:N  └──────────────┘
                              │
                              │ 1:N
                              ▼
                        ┌──────────────┐      ┌──────────────┐
                        │ sale_items   │─────>│  products    │
                        └──────────────┘  N:1 └──────────────┘
                                                     │
                                                     │ 1:N
                                                     ▼
                                              ┌──────────────────┐
                                              │menu_compositions│
                                              └──────────────────┘

┌─────────────┐
│    users    │────────<│ cash_registers │
└─────────────┘    1:N  └────────────────┘


┌─────────────┐
│    users    │────────<│  audit_logs    │
└─────────────┘    1:N  └────────────────┘
```

## 📋 Tables Détaillées

### 1. users (Utilisateurs/Caissiers)

Stocke les comptes utilisateurs (administrateurs et caissiers).

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    pin_code VARCHAR(255) NOT NULL,        -- Hash bcrypt du PIN (4 chiffres)
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
```

**Données exemple** :
- Admin : username=`admin`, pin=`1234` (hash), role=`admin`
- Caissier 1 : username=`john`, pin=`5678` (hash), role=`cashier`

---

### 2. products (Produits)

Catalogue de tous les produits vendables (burgers, boissons, menus, etc.).

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_ht DECIMAL(10, 2) NOT NULL,      -- Prix HT en euros
    vat_rate DECIMAL(4, 2) NOT NULL        -- Taux TVA : 5.5, 10.0, 20.0
        CHECK (vat_rate IN (5.5, 10.0, 20.0)),
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('burgers', 'sides', 'drinks', 'desserts', 'menus')),
    image_url VARCHAR(500),                -- URL ou chemin image
    is_active BOOLEAN DEFAULT TRUE,        -- Produit visible en vente
    is_menu BOOLEAN DEFAULT FALSE,         -- TRUE si c'est un menu/combo
    display_order INT DEFAULT 0,           -- Ordre d'affichage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP                   -- Soft delete
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_menu ON products(is_menu);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
```

**Colonnes calculées** (via getter) :
- `price_ttc` : `price_ht * (1 + vat_rate/100)`

**Exemple** :
- Burger Classic : price_ht=8.26, vat_rate=10.0 → price_ttc=9.09€
- Menu XL : is_menu=TRUE, price_ht=11.00, vat_rate=10.0

---

### 3. menu_compositions (Composition des Menus)

Définit les produits inclus dans un menu (relation many-to-many).

```sql
CREATE TABLE menu_compositions (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,   -- Quantité incluse (ex: 1 burger, 2 sauces)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menu CHECK (
        (SELECT is_menu FROM products WHERE id = menu_id) = TRUE
    )
);

CREATE INDEX idx_menu_compositions_menu_id ON menu_compositions(menu_id);
CREATE INDEX idx_menu_compositions_product_id ON menu_compositions(product_id);
```

**Exemple** :
Menu XL (id=50) contient :
- product_id=1 (Burger Classic), quantity=1
- product_id=15 (Frites), quantity=1
- product_id=20 (Coca), quantity=1

---

### 4. sales (Ventes)

Enregistre chaque transaction de vente.

```sql
CREATE SEQUENCE ticket_number_seq START 1;

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,  -- Format: YYYYMMDD-0001
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Totaux
    total_ht DECIMAL(10, 2) NOT NULL,
    total_ttc DECIMAL(10, 2) NOT NULL,

    -- Détail TVA (JSONB pour flexibilité)
    vat_details JSONB NOT NULL,            -- {"5.5": {"base": 10, "vat": 0.55}, ...}

    -- Paiement
    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('cash', 'card', 'meal_voucher', 'mixed')),
    payment_details JSONB,                 -- Détails paiement mixte
    amount_paid DECIMAL(10, 2) NOT NULL,   -- Montant total payé
    change_given DECIMAL(10, 2) DEFAULT 0, -- Monnaie rendue

    -- Statut
    status VARCHAR(20) DEFAULT 'completed'
        CHECK (status IN ('completed', 'cancelled', 'refunded')),

    -- Métadonnées
    cash_register_id INTEGER REFERENCES cash_registers(id),
    notes TEXT,                            -- Notes caissier

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
```

**Génération ticket_number** :
```sql
-- Trigger pour auto-générer le numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                         LPAD(nextval('ticket_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_ticket_number
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();
```

**Exemple payment_details** (paiement mixte) :
```json
{
  "cash": 20.00,
  "card": 15.50,
  "meal_voucher": 10.00
}
```

---

### 5. sale_items (Lignes de Vente)

Détail des produits vendus dans chaque transaction.

```sql
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),    -- NULL si produit supprimé

    -- Dénormalisation pour historique (produit peut être modifié/supprimé)
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_ht DECIMAL(10, 2) NOT NULL,
    vat_rate DECIMAL(4, 2) NOT NULL,

    -- Totaux ligne
    total_ht DECIMAL(10, 2) NOT NULL,
    total_ttc DECIMAL(10, 2) NOT NULL,

    -- Remise (optionnel)
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
```

**Calculs** :
```
total_ht = (unit_price_ht * quantity) - discount_amount
total_ttc = total_ht * (1 + vat_rate/100)
```

---

### 6. cash_registers (Caisses)

Suivi des ouvertures/fermetures de caisse par caissier.

```sql
CREATE TABLE cash_registers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Montants
    opening_amount DECIMAL(10, 2) NOT NULL,     -- Fond de caisse
    closing_amount DECIMAL(10, 2),              -- Montant final déclaré
    expected_cash DECIMAL(10, 2),               -- Espèces théoriques
    actual_cash DECIMAL(10, 2),                 -- Espèces comptées
    cash_difference DECIMAL(10, 2),             -- Écart (+ ou -)

    -- Totaux par mode de paiement
    total_sales DECIMAL(10, 2) DEFAULT 0,       -- Total TTC ventes
    total_cash DECIMAL(10, 2) DEFAULT 0,        -- Total espèces
    total_card DECIMAL(10, 2) DEFAULT 0,        -- Total CB
    total_meal_voucher DECIMAL(10, 2) DEFAULT 0,-- Total titres resto

    -- Statistiques
    ticket_count INTEGER DEFAULT 0,             -- Nombre de tickets

    -- Statut
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),

    -- Rapport de clôture (détail comptage billets/pièces)
    closing_report JSONB,

    -- Hash pour conformité NF525
    closing_hash VARCHAR(64),                   -- SHA-256 du rapport

    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX idx_cash_registers_user_id ON cash_registers(user_id);
CREATE INDEX idx_cash_registers_status ON cash_registers(status);
CREATE INDEX idx_cash_registers_opened_at ON cash_registers(opened_at);
```

**Exemple closing_report** :
```json
{
  "bills": {
    "500": 0,
    "200": 1,
    "100": 0,
    "50": 2,
    "20": 5,
    "10": 10,
    "5": 20
  },
  "coins": {
    "2": 10,
    "1": 15,
    "0.5": 20,
    "0.2": 25,
    "0.1": 30,
    "0.05": 10,
    "0.02": 15,
    "0.01": 20
  },
  "counted_total": 545.65
}
```

---

### 7. audit_logs (Traçabilité)

Logs de toutes les actions critiques (conformité NF525).

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),

    action VARCHAR(20) NOT NULL
        CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),

    entity_type VARCHAR(50) NOT NULL,          -- 'product', 'sale', 'user', etc.
    entity_id INTEGER,

    old_values JSONB,                          -- Valeurs avant modification
    new_values JSONB,                          -- Valeurs après modification

    ip_address VARCHAR(45),                    -- IPv4 ou IPv6
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## 🔐 Contraintes d'Intégrité

### Règles Métier

1. **Unicité ticket_number** : Assuré par contrainte UNIQUE + séquence PostgreSQL
2. **Soft delete produits** : `deleted_at IS NULL` dans les requêtes
3. **Caisse unique ouverte** : Un user ne peut avoir qu'une seule caisse status='open'
4. **Cohérence TVA** : Les taux sont fixes (5.5%, 10%, 20%)
5. **Totaux ventes** : `total_ttc = SUM(sale_items.total_ttc)`

### Triggers

```sql
-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 📈 Optimisations Performance

### Index Stratégiques

```sql
-- Recherche produits actifs par catégorie (écran POS)
CREATE INDEX idx_products_active_category
ON products(category, is_active, display_order)
WHERE deleted_at IS NULL;

-- Recherche ventes du jour
CREATE INDEX idx_sales_today
ON sales(created_at, status)
WHERE status = 'completed';

-- Caisse ouverte d'un utilisateur
CREATE INDEX idx_cash_register_open
ON cash_registers(user_id, status)
WHERE status = 'open';
```

### Vues Matérialisées (Optionnel - Phase 2)

```sql
-- Vue des ventes du jour (refresh toutes les 5 min)
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    DATE(created_at) as sale_date,
    COUNT(*) as ticket_count,
    SUM(total_ttc) as total_revenue,
    AVG(total_ttc) as avg_basket,
    payment_method,
    user_id
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at), payment_method, user_id;

CREATE UNIQUE INDEX ON daily_sales_summary(sale_date, payment_method, user_id);
```

---

## 🧪 Requêtes Fréquentes

### 1. Produits actifs pour POS (par catégorie)
```sql
SELECT id, name, price_ht, vat_rate, image_url,
       price_ht * (1 + vat_rate/100) as price_ttc
FROM products
WHERE category = 'burgers'
  AND is_active = TRUE
  AND deleted_at IS NULL
ORDER BY display_order, name;
```

### 2. Ventes du jour avec items
```sql
SELECT s.*,
       json_agg(
           json_build_object(
               'product_name', si.product_name,
               'quantity', si.quantity,
               'total_ttc', si.total_ttc
           )
       ) as items
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE DATE(s.created_at) = CURRENT_DATE
  AND s.status = 'completed'
GROUP BY s.id
ORDER BY s.created_at DESC;
```

### 3. Caisse ouverte d'un utilisateur
```sql
SELECT * FROM cash_registers
WHERE user_id = $1 AND status = 'open'
ORDER BY opened_at DESC
LIMIT 1;
```

### 4. Top 10 produits vendus (période)
```sql
SELECT
    si.product_name,
    SUM(si.quantity) as total_quantity,
    SUM(si.total_ttc) as total_revenue
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
WHERE s.created_at BETWEEN $1 AND $2
  AND s.status = 'completed'
GROUP BY si.product_name
ORDER BY total_quantity DESC
LIMIT 10;
```

### 5. Récapitulatif TVA du jour
```sql
SELECT
    si.vat_rate,
    SUM(si.total_ht) as base_ht,
    SUM(si.total_ttc - si.total_ht) as total_vat,
    SUM(si.total_ttc) as total_ttc
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
WHERE DATE(s.created_at) = CURRENT_DATE
  AND s.status = 'completed'
GROUP BY si.vat_rate
ORDER BY si.vat_rate;
```

---

## 💾 Sizing & Estimation

### Volumes Attendus (par jour)

- **Ventes** : ~200 tickets/jour
- **Sale items** : ~500 lignes/jour (2.5 items/ticket moyenne)
- **Produits** : ~50-100 max
- **Users** : ~5-10 max
- **Audit logs** : ~500 entrées/jour

### Croissance (1 an)

- **Sales** : 200 × 365 = 73,000 lignes (~10 MB)
- **Sale items** : 500 × 365 = 182,500 lignes (~30 MB)
- **Audit logs** : 500 × 365 = 182,500 lignes (~50 MB)

**Total estimé (1 an)** : ~100 MB (très gérable)

### Stratégie Archivage

- **Conservation chaude** : 12 mois en BDD
- **Archive froide** : > 12 mois → Export JSON mensuel
- **Purge audit logs** : Anonymisation après 3 mois (RGPD)

---

## 🔄 Migrations Futures

### Version 1.1 - Gestion Stock
```sql
ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN stock_alert_threshold INTEGER DEFAULT 5;
```

### Version 1.2 - Multi-caisses
```sql
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    address TEXT,
    siret VARCHAR(14)
);

ALTER TABLE cash_registers ADD COLUMN store_id INTEGER REFERENCES stores(id);
```

---

**Dernière mise à jour** : 2025-01-10
