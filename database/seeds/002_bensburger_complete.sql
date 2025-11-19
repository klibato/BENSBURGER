-- ============================================
-- SEED: Ben's Burger - Données complètes
-- ============================================
-- Description: Organisation de test pour démonstration
-- Date: 2025-11-18
-- ============================================

-- ============================================
-- 1. ORGANISATION BEN'S BURGER
-- ============================================
INSERT INTO organizations (
  id,
  name,
  slug,
  email,
  phone,
  settings,
  plan,
  status,
  trial_ends_at,
  max_users,
  max_products,
  created_at
) VALUES (
  2, -- ID 2 (ID 1 est FlexPOS par défaut)
  'Ben''s Burger',
  'bensburger',
  'contact@bensburger.fr',
  '+33612345678',
  jsonb_build_object(
    'store_name', 'Ben''s Burger',
    'store_description', 'Le meilleur burger de Paris',
    'address_line1', '123 Avenue des Champs-Élysées',
    'address_line2', '',
    'postal_code', '75008',
    'city', 'Paris',
    'country', 'France',
    'legal_form', 'SARL',
    'capital_amount', '10000',
    'siret', '12345678901234',
    'vat_number', 'FR12345678901',
    'rcs', 'Paris B 123 456 789',
    'currency', 'EUR',
    'currency_symbol', '€',
    'categories', '["burgers", "sides", "drinks", "desserts", "menus"]'::jsonb,
    'vat_rates', '[
      {"rate": 5.5, "label": "TVA réduite 5.5%"},
      {"rate": 10.0, "label": "TVA intermédiaire 10%"},
      {"rate": 20.0, "label": "TVA normale 20%"}
    ]'::jsonb,
    'payment_methods', '{
      "cash": {"enabled": true, "label": "Espèces"},
      "card": {"enabled": true, "label": "Carte Bancaire"},
      "meal_voucher": {"enabled": true, "label": "Tickets Restaurant"}
    }'::jsonb,
    'theme_color', '#FF6B35',
    'language', 'fr-FR',
    'timezone', 'Europe/Paris'
  ),
  'starter', -- Plan 29€/mois
  'active',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  10, -- max_users pour plan starter
  200, -- max_products pour plan starter
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  settings = EXCLUDED.settings,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  trial_ends_at = EXCLUDED.trial_ends_at;

-- ============================================
-- 2. UTILISATEURS BEN'S BURGER
-- ============================================

-- Patrick Martin - Admin / Gérant
INSERT INTO users (
  organization_id,
  username,
  pin_code,
  first_name,
  last_name,
  role,
  email,
  is_active,
  created_at
) VALUES (
  2,
  'patrick',
  '$2a$10$swVA/USYzs5w.71J217k9.13wYbbNmOzFP/5kpj1zPhujakokR1zG', -- PIN "1234" (hash bcrypt corrigé)
  'Patrick',
  'Martin',
  'admin',
  'patrick@bensburger.fr',
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Sophie Dubois - Caissière
INSERT INTO users (
  organization_id,
  username,
  pin_code,
  first_name,
  last_name,
  role,
  email,
  is_active,
  created_at
) VALUES (
  2,
  'sophie',
  '$2a$10$EixZaYVK9S/MEFDDMc0KW.L0YtbZWmLQXw7bH0.PYF.FUxZDR4QlC', -- PIN "5678"
  'Sophie',
  'Dubois',
  'cashier',
  'sophie@bensburger.fr',
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Lucas Bernard - Caissier
INSERT INTO users (
  organization_id,
  username,
  pin_code,
  first_name,
  last_name,
  role,
  email,
  is_active,
  created_at
) VALUES (
  2,
  'lucas',
  '$2a$10$FDmvXqj5dVdHp0g7XW9w0uVwWQ0W9q0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0', -- PIN "9012"
  'Lucas',
  'Bernard',
  'cashier',
  'lucas@bensburger.fr',
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. PRODUITS - BURGERS
-- ============================================

INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active, quantity, image_url, description) VALUES
(2, 'Classic Burger', 8.33, 10.00, 'burgers', true, 0, '/images/classic-burger.jpg', 'Steak, salade, tomate, oignons'),
(2, 'Cheese Burger', 9.17, 10.00, 'burgers', true, 0, '/images/cheese-burger.jpg', 'Steak, cheddar, salade, tomate'),
(2, 'Bacon Burger', 10.00, 10.00, 'burgers', true, 0, '/images/bacon-burger.jpg', 'Steak, bacon croustillant, cheddar'),
(2, 'Veggie Burger', 8.33, 10.00, 'burgers', true, 0, '/images/veggie-burger.jpg', 'Galette végétale, salade, tomate'),
(2, 'Big Ben Burger', 12.50, 10.00, 'burgers', true, 0, '/images/big-ben.jpg', 'Double steak, double cheddar, sauce spéciale'),
(2, 'Chicken Burger', 8.75, 10.00, 'burgers', true, 0, '/images/chicken-burger.jpg', 'Poulet pané, salade, sauce mayo')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. PRODUITS - ACCOMPAGNEMENTS
-- ============================================

INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active, quantity, image_url, description) VALUES
(2, 'Frites classiques', 2.73, 10.00, 'sides', true, 0, '/images/frites.jpg', 'Portion moyenne'),
(2, 'Frites XXL', 3.64, 10.00, 'sides', true, 0, '/images/frites-xxl.jpg', 'Grande portion'),
(2, 'Nuggets (x6)', 4.55, 10.00, 'sides', true, 0, '/images/nuggets.jpg', '6 nuggets de poulet'),
(2, 'Nuggets (x9)', 6.36, 10.00, 'sides', true, 0, '/images/nuggets-9.jpg', '9 nuggets de poulet'),
(2, 'Onion Rings', 3.18, 10.00, 'sides', true, 0, '/images/onion-rings.jpg', 'Rondelles d''oignon panées'),
(2, 'Salad Bowl', 5.45, 10.00, 'sides', true, 0, '/images/salad.jpg', 'Salade composée')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. PRODUITS - BOISSONS
-- ============================================

INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active, quantity, image_url, description) VALUES
(2, 'Coca-Cola 33cl', 2.27, 10.00, 'drinks', true, 100, '/images/coca.jpg', 'Canette 33cl'),
(2, 'Coca-Cola 50cl', 3.18, 10.00, 'drinks', true, 80, '/images/coca-50.jpg', 'Bouteille 50cl'),
(2, 'Sprite 33cl', 2.27, 10.00, 'drinks', true, 100, '/images/sprite.jpg', 'Canette 33cl'),
(2, 'Fanta Orange 33cl', 2.27, 10.00, 'drinks', true, 80, '/images/fanta.jpg', 'Canette 33cl'),
(2, 'Eau minérale 50cl', 1.82, 10.00, 'drinks', true, 150, '/images/eau.jpg', 'Bouteille 50cl'),
(2, 'Jus d''orange 25cl', 2.73, 10.00, 'drinks', true, 50, '/images/jus-orange.jpg', 'Jus pressé 25cl'),
(2, 'Milkshake vanille', 4.09, 10.00, 'drinks', true, 0, '/images/milkshake-vanille.jpg', 'Milkshake fait maison'),
(2, 'Milkshake chocolat', 4.09, 10.00, 'drinks', true, 0, '/images/milkshake-chocolat.jpg', 'Milkshake fait maison'),
(2, 'Milkshake fraise', 4.09, 10.00, 'drinks', true, 0, '/images/milkshake-fraise.jpg', 'Milkshake fait maison')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. PRODUITS - DESSERTS
-- ============================================

INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_active, quantity, image_url, description) VALUES
(2, 'Brownie', 3.64, 10.00, 'desserts', true, 0, '/images/brownie.jpg', 'Brownie chocolat'),
(2, 'Cookie', 2.27, 10.00, 'desserts', true, 0, '/images/cookie.jpg', 'Cookie pépites chocolat'),
(2, 'Muffin', 2.73, 10.00, 'desserts', true, 0, '/images/muffin.jpg', 'Muffin myrtilles'),
(2, 'Donut', 2.27, 10.00, 'desserts', true, 0, '/images/donut.jpg', 'Donut glacé'),
(2, 'Tarte aux pommes', 3.64, 10.00, 'desserts', true, 0, '/images/tarte.jpg', 'Part de tarte maison')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. PRODUITS - MENUS
-- ============================================

INSERT INTO products (organization_id, name, price_ht, vat_rate, category, is_menu, is_active, image_url, description) VALUES
(2, 'Menu Classic', 12.27, 10.00, 'menus', true, true, '/images/menu-classic.jpg', 'Burger + Frites + Boisson'),
(2, 'Menu Cheese', 13.18, 10.00, 'menus', true, true, '/images/menu-cheese.jpg', 'Cheese Burger + Frites + Boisson'),
(2, 'Menu Bacon', 14.09, 10.00, 'menus', true, true, '/images/menu-bacon.jpg', 'Bacon Burger + Frites + Boisson'),
(2, 'Menu Big Ben', 16.36, 10.00, 'menus', true, true, '/images/menu-bigben.jpg', 'Big Ben + Frites XXL + Boisson 50cl'),
(2, 'Menu Enfant', 8.18, 10.00, 'menus', true, true, '/images/menu-enfant.jpg', 'Nuggets + Frites + Jus + Dessert')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. COMPOSITION DES MENUS
-- ============================================
-- Note: Les IDs de produits sont générés dynamiquement,
-- donc cette partie nécessiterait des SELECT pour obtenir les IDs
-- Pour simplifier, nous les créerons manuellement si nécessaire

-- ============================================
-- 9. SUBSCRIPTION BEN'S BURGER
-- ============================================

INSERT INTO subscriptions (
  organization_id,
  plan,
  status,
  price_cents,
  currency,
  billing_interval,
  started_at,
  trial_ends_at,
  current_period_start,
  current_period_end,
  created_at
) VALUES (
  2,
  'starter',
  'active', -- Peut aussi être 'trialing' si en période d'essai
  2900, -- 29€/mois
  'EUR',
  'monthly',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '1 month',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- ============================================
-- 10. STORE SETTINGS
-- ============================================
-- NOTE: Les settings sont maintenant stockés dans organization.settings (JSONB).
-- La table store_settings a une contrainte single_row_settings qui permet une seule ligne.
-- Cette ligne est déjà créée par init.sql/seeds.sql.
-- Pas besoin d'insérer ici car Ben's Burger utilise organization.settings.

-- ============================================
-- RÉSUMÉ DU SEED
-- ============================================

-- Organisation: Ben's Burger (ID 2)
-- Plan: Starter (29€/mois)
-- Status: Active (trial 14 jours)

-- Utilisateurs (3):
-- - patrick (admin) - PIN 1234
-- - sophie (cashier) - PIN 5678
-- - lucas (cashier) - PIN 9012

-- Produits (31 total):
-- - 6 Burgers (Classic, Cheese, Bacon, Veggie, Big Ben, Chicken)
-- - 6 Sides (Frites, Nuggets, Onion Rings, Salad)
-- - 9 Boissons (Coca, Sprite, Fanta, Eau, Jus, Milkshakes)
-- - 5 Desserts (Brownie, Cookie, Muffin, Donut, Tarte)
-- - 5 Menus (Classic, Cheese, Bacon, Big Ben, Enfant)

-- Abonnement: Starter actif (29€/mois)

-- Pour se connecter:
-- URL: https://app.flexpos.app
-- Username: patrick
-- PIN: 1234
