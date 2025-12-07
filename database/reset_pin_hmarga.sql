-- Reset PIN de l'utilisateur hmarga à 123456
-- Hash bcrypt généré: $2a$10$0zlnVn.GtVbVglCMLt28G.o.P9FhaUjmYmSn83A7ufh5/z9YgUeXm

UPDATE users
SET pin_code = '$2a$10$0zlnVn.GtVbVglCMLt28G.o.P9FhaUjmYmSn83A7ufh5/z9YgUeXm'
WHERE username = 'hmarga'
  AND organization_id = 2;

-- Vérifier le résultat
SELECT id, username, organization_id, is_active,
       LEFT(pin_code, 20) || '...' as pin_hash_preview
FROM users
WHERE username = 'hmarga' AND organization_id = 2;
