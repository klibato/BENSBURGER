-- ============================================
-- BensBurger POS - Seed Data (Données de Démo)
-- ============================================

-- ATTENTION : Ce script insère des données de test
-- NE PAS UTILISER EN PRODUCTION

-- ============================================
-- USERS (Utilisateurs)
-- ============================================
-- PIN codes hachés avec bcrypt (rounds=10)
-- admin: 1234 -> $2a$10$YourHashHere (sera généré par le backend)
-- john: 5678
-- marie: 9999

-- Note: Les hash bcrypt seront générés par le backend
-- Pour le développement, on utilise des hash temporaires

INSERT INTO users (username, pin_code, role, first_name, last_name, email, is_active) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'Admin', 'Principal', 'admin@bensburger.com', TRUE),
('john', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cashier', 'John', 'Doe', 'john@bensburger.com', TRUE),
('marie', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cashier', 'Marie', 'Martin', 'marie@bensburger.com', TRUE);

-- ============================================
-- PRODUCTS - BURGERS
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order) VALUES
('Burger Classic', 'Steak haché, salade, tomate, oignons, sauce maison', 8.26, 10.0, 'burgers', TRUE, FALSE, 1),
('Burger Bacon', 'Steak haché, bacon croustillant, cheddar, sauce BBQ', 9.09, 10.0, 'burgers', TRUE, FALSE, 2),
('Burger Cheese', 'Double steak, double cheddar, cornichons, ketchup', 9.55, 10.0, 'burgers', TRUE, FALSE, 3),
('Burger Poulet', 'Filet de poulet pané, salade, tomate, mayo', 8.64, 10.0, 'burgers', TRUE, FALSE, 4),
('Burger Végétarien', 'Steak végétal, crudités, guacamole', 8.18, 10.0, 'burgers', TRUE, FALSE, 5),
('Burger XL', 'Triple steak, triple cheese, bacon, œuf, sauce spéciale', 12.27, 10.0, 'burgers', TRUE, FALSE, 6);

-- ============================================
-- PRODUCTS - SIDES (Accompagnements)
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order) VALUES
('Frites', 'Frites maison croustillantes', 2.73, 10.0, 'sides', TRUE, FALSE, 1),
('Potatoes', 'Pommes de terre rissolées', 3.18, 10.0, 'sides', TRUE, FALSE, 2),
('Onion Rings', '6 rondelles d''oignons panées', 3.64, 10.0, 'sides', TRUE, FALSE, 3),
('Nuggets (6)', '6 nuggets de poulet', 4.55, 10.0, 'sides', TRUE, FALSE, 4),
('Salade César', 'Salade verte, poulet, parmesan, croûtons', 6.36, 10.0, 'sides', TRUE, FALSE, 5);

-- ============================================
-- PRODUCTS - DRINKS (Boissons)
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order) VALUES
('Coca-Cola 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 1),
('Coca-Cola 50cl', 'Bouteille 50cl', 3.18, 10.0, 'drinks', TRUE, FALSE, 2),
('Coca-Cola Zéro 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 3),
('Sprite 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 4),
('Fanta Orange 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 5),
('Eau Minérale 50cl', 'Bouteille 50cl', 1.82, 10.0, 'drinks', TRUE, FALSE, 6),
('Ice Tea 33cl', 'Canette 33cl', 2.73, 10.0, 'drinks', TRUE, FALSE, 7),
('Jus d''Orange 25cl', 'Bouteille 25cl', 3.18, 10.0, 'drinks', TRUE, FALSE, 8);

-- ============================================
-- PRODUCTS - DESSERTS
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order) VALUES
('Cookie Chocolat', 'Cookie maison aux pépites de chocolat', 2.27, 10.0, 'desserts', TRUE, FALSE, 1),
('Brownie', 'Brownie au chocolat', 2.73, 10.0, 'desserts', TRUE, FALSE, 2),
('Muffin Myrtille', 'Muffin aux myrtilles', 2.27, 10.0, 'desserts', TRUE, FALSE, 3),
('Sundae Caramel', 'Glace vanille, sauce caramel, chantilly', 3.64, 10.0, 'desserts', TRUE, FALSE, 4),
('Sundae Chocolat', 'Glace chocolat, sauce chocolat, chantilly', 3.64, 10.0, 'desserts', TRUE, FALSE, 5),
('Tiramisu', 'Tiramisu maison', 4.09, 10.0, 'desserts', TRUE, FALSE, 6);

-- ============================================
-- PRODUCTS - MENUS
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order) VALUES
('Menu Classic', 'Burger Classic + Frites + Boisson 33cl', 11.36, 10.0, 'menus', TRUE, TRUE, 1),
('Menu Bacon', 'Burger Bacon + Frites + Boisson 33cl', 12.27, 10.0, 'menus', TRUE, TRUE, 2),
('Menu Cheese', 'Burger Cheese + Frites + Boisson 33cl', 12.73, 10.0, 'menus', TRUE, TRUE, 3),
('Menu XL', 'Burger XL + Potatoes + Boisson 50cl + Dessert', 18.18, 10.0, 'menus', TRUE, TRUE, 4),
('Menu Enfant', 'Nuggets 6 + Frites + Boisson 33cl + Dessert', 9.09, 10.0, 'menus', TRUE, TRUE, 5);

-- ============================================
-- MENU COMPOSITIONS
-- ============================================
-- Menu Classic (id=31)
INSERT INTO menu_compositions (menu_id, product_id, quantity) VALUES
(31, 1, 1),  -- Burger Classic
(31, 7, 1),  -- Frites
(31, 13, 1); -- Coca-Cola 33cl

-- Menu Bacon (id=32)
INSERT INTO menu_compositions (menu_id, product_id, quantity) VALUES
(32, 2, 1),  -- Burger Bacon
(32, 7, 1),  -- Frites
(32, 13, 1); -- Coca-Cola 33cl

-- Menu Cheese (id=33)
INSERT INTO menu_compositions (menu_id, product_id, quantity) VALUES
(33, 3, 1),  -- Burger Cheese
(33, 7, 1),  -- Frites
(33, 13, 1); -- Coca-Cola 33cl

-- Menu XL (id=34)
INSERT INTO menu_compositions (menu_id, product_id, quantity) VALUES
(34, 6, 1),  -- Burger XL
(34, 8, 1),  -- Potatoes
(34, 14, 1), -- Coca-Cola 50cl
(34, 25, 1); -- Cookie Chocolat

-- Menu Enfant (id=35)
INSERT INTO menu_compositions (menu_id, product_id, quantity) VALUES
(35, 10, 1), -- Nuggets
(35, 7, 1),  -- Frites
(35, 13, 1), -- Coca-Cola 33cl
(35, 25, 1); -- Cookie Chocolat

-- ============================================
-- Fin du seeding
-- ============================================
-- Total produits : 35
-- - Burgers: 6
-- - Sides: 5
-- - Drinks: 8
-- - Desserts: 6
-- - Menus: 5 (avec compositions)

-- Utilisateurs : 3
-- - 1 admin (admin/1234)
-- - 2 caissiers (john/5678, marie/9999)
