-- ============================================
-- FlexPOS - Seed Data Production
-- ============================================
-- ATTENTION : Ce script est utilisé UNIQUEMENT en environnement de développement
-- En production, les comptes sont créés via l'interface ou les migrations

-- ============================================
-- USERS - Compte Admin Organisation par Défaut
-- ============================================
-- PIN sécurisé : 789456 (hash bcrypt, 10 rounds)
-- À CHANGER EN PRODUCTION via l'interface
INSERT INTO users (username, pin_code, role, first_name, last_name, email, is_active, organization_id, created_at, updated_at) VALUES
('admin', '$2a$10$xKqE8PgJZL5wQ9VZ3kN.RuOmZvX7yDKXY.h9YsGQPZx.6K4N2Fq/K', 'admin', 'Admin', 'Organisation', 'admin@organization.local', TRUE, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- PRODUCTS - BURGERS
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order, organization_id) VALUES
('Burger Classic', 'Steak haché, salade, tomate, oignons, sauce maison', 8.26, 10.0, 'burgers', TRUE, FALSE, 1, 1),
('Burger Bacon', 'Steak haché, bacon croustillant, cheddar, sauce BBQ', 9.09, 10.0, 'burgers', TRUE, FALSE, 2, 1),
('Burger Cheese', 'Double steak, double cheddar, cornichons, ketchup', 9.55, 10.0, 'burgers', TRUE, FALSE, 3, 1),
('Burger Poulet', 'Filet de poulet pané, salade, tomate, mayo', 8.64, 10.0, 'burgers', TRUE, FALSE, 4, 1),
('Burger Végétarien', 'Steak végétal, crudités, guacamole', 8.18, 10.0, 'burgers', TRUE, FALSE, 5, 1),
('Burger XL', 'Triple steak, triple cheese, bacon, œuf, sauce spéciale', 12.27, 10.0, 'burgers', TRUE, FALSE, 6, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTS - SIDES (Accompagnements)
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order, organization_id) VALUES
('Frites', 'Frites maison croustillantes', 2.73, 10.0, 'sides', TRUE, FALSE, 1, 1),
('Potatoes', 'Pommes de terre rissolées', 3.18, 10.0, 'sides', TRUE, FALSE, 2, 1),
('Onion Rings', '6 rondelles d''oignons panées', 3.64, 10.0, 'sides', TRUE, FALSE, 3, 1),
('Nuggets (6)', '6 nuggets de poulet', 4.55, 10.0, 'sides', TRUE, FALSE, 4, 1),
('Salade César', 'Salade verte, poulet, parmesan, croûtons', 6.36, 10.0, 'sides', TRUE, FALSE, 5, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTS - DRINKS (Boissons)
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order, organization_id) VALUES
('Coca-Cola 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 1, 1),
('Coca-Cola 50cl', 'Bouteille 50cl', 3.18, 10.0, 'drinks', TRUE, FALSE, 2, 1),
('Coca-Cola Zéro 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 3, 1),
('Sprite 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 4, 1),
('Fanta Orange 33cl', 'Canette 33cl', 2.27, 10.0, 'drinks', TRUE, FALSE, 5, 1),
('Eau Minérale 50cl', 'Bouteille 50cl', 1.82, 10.0, 'drinks', TRUE, FALSE, 6, 1),
('Ice Tea 33cl', 'Canette 33cl', 2.73, 10.0, 'drinks', TRUE, FALSE, 7, 1),
('Jus d''Orange 25cl', 'Bouteille 25cl', 3.18, 10.0, 'drinks', TRUE, FALSE, 8, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTS - DESSERTS
-- ============================================
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order, organization_id) VALUES
('Brownie Chocolat', 'Brownie maison au chocolat noir', 3.64, 10.0, 'desserts', TRUE, FALSE, 1, 1),
('Cookie XXL', 'Cookie géant pépites de chocolat', 2.73, 10.0, 'desserts', TRUE, FALSE, 2, 1),
('Tiramisu', 'Tiramisu traditionnel', 4.55, 10.0, 'desserts', TRUE, FALSE, 3, 1),
('Muffin Myrtille', 'Muffin aux myrtilles fraîches', 3.18, 10.0, 'desserts', TRUE, FALSE, 4, 1),
('Glace 2 Boules', 'Au choix: vanille, chocolat, fraise', 4.09, 10.0, 'desserts', TRUE, FALSE, 5, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- MENUS - FORMULES
-- ============================================
-- Création des menus (produits avec is_menu=TRUE)
INSERT INTO products (name, description, price_ht, vat_rate, category, is_active, is_menu, display_order, organization_id) VALUES
('Menu Classic', 'Burger Classic + Accompagnement + Boisson', 13.64, 10.0, 'menus', TRUE, TRUE, 1, 1),
('Menu Bacon', 'Burger Bacon + Accompagnement + Boisson', 14.55, 10.0, 'menus', TRUE, TRUE, 2, 1),
('Menu Cheese', 'Burger Cheese + Accompagnement + Boisson', 15.00, 10.0, 'menus', TRUE, TRUE, 3, 1),
('Menu XL', 'Burger XL + Accompagnement + Boisson + Dessert', 20.00, 10.0, 'menus', TRUE, TRUE, 4, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- NOTE SÉCURITÉ
-- ============================================
-- ⚠️  EN PRODUCTION :
-- 1. Changer le PIN admin (789456) via l'interface
-- 2. Créer des utilisateurs spécifiques pour chaque employé
-- 3. Ne JAMAIS utiliser le compte admin pour les opérations courantes
-- 4. Activer l'audit trail pour surveiller les connexions
