# Upload d'images produits - FlexPOS

## 📸 Fonctionnalité d'upload d'images locales

Cette fonctionnalité permet d'uploader et de stocker des images produits **localement sur le serveur**, sans dépendre d'un service externe.

---

## 🚀 Endpoints API

### 1. Upload d'une image produit

**POST** `/api/products/:id/image`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `image`: Fichier image (JPEG, PNG, WebP, GIF)

**Taille max:** 5 MB

**Exemple cURL:**
```bash
curl -X POST https://api.flexpos.app/api/products/123/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

**Réponse succès (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Pizza Margherita",
    "image_path": "uploads/products/1732118400000_abc123def456.jpg",
    "image_url": "/api/products/123/image"
  },
  "message": "Image uploadée avec succès"
}
```

---

### 2. Récupérer une image produit

**GET** `/uploads/products/<filename>`

**Exemple:**
```
https://api.flexpos.app/uploads/products/1732118400000_abc123def456.jpg
```

Les images sont servies statiquement par Express.

---

### 3. Supprimer une image produit

**DELETE** `/api/products/:id/image`

**Headers:**
```
Authorization: Bearer <token>
```

**Exemple cURL:**
```bash
curl -X DELETE https://api.flexpos.app/api/products/123/image \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse succès (200):**
```json
{
  "success": true,
  "message": "Image supprimée avec succès",
  "data": {
    "file_deleted": true
  }
}
```

---

## 📁 Structure de stockage

```
backend/
├── uploads/
│   └── products/
│       ├── 1732118400000_abc123def456.jpg
│       ├── 1732118401000_def789ghi012.png
│       └── ...
```

### Nommage des fichiers

Format: `<timestamp>_<random_32_chars>.<extension>`

- **Timestamp:** Date/heure d'upload en millisecondes
- **Random:** 32 caractères hexadécimaux aléatoires (crypto.randomBytes)
- **Extension:** .jpg, .png, .webp, .gif

**Exemples:**
- `1732118400000_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.jpg`
- `1732118401234_f9e8d7c6b5a4938271605948372615.png`

---

## 🔒 Sécurité

### Formats acceptés

- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)
- `image/gif` (.gif)

Tout autre format est **rejeté automatiquement**.

### Taille max

- **5 MB** par fichier
- Configurable dans `uploadMiddleware.js:45`

### Permissions

- **Upload:** `PRODUCTS_UPDATE`
- **Suppression:** `PRODUCTS_DELETE`

### Isolation multi-tenant

- ✅ Chaque image est liée à un produit
- ✅ Chaque produit appartient à une organisation
- ✅ Impossible d'accéder aux images d'une autre organisation

---

## 🗄️ Base de données

### Champs ajoutés au modèle Product

```javascript
{
  image_url: String(500),   // URL externe (optionnel, ancien système)
  image_path: String(500),  // Chemin local (nouveau système)
}
```

**Migration SQL:** `database/migrations/028_add_image_path_to_products.sql`

### Exemple

```sql
SELECT id, name, image_path FROM products WHERE organization_id = 1;
```

| id  | name             | image_path                                      |
|-----|------------------|-------------------------------------------------|
| 123 | Pizza Margherita | uploads/products/1732118400000_abc123.jpg       |
| 124 | Burger Cheese    | uploads/products/1732118401000_def456.png       |

---

## 🖼️ Utilisation frontend

### React / Vue / Angular

```javascript
// Upload d'image
const uploadImage = async (productId, file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.flexpos.app/api/products/${productId}/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
};

// Afficher l'image
<img
  src={`https://api.flexpos.app/${product.image_path}`}
  alt={product.name}
/>
```

### HTML Form

```html
<form action="/api/products/123/image" method="POST" enctype="multipart/form-data">
  <input type="file" name="image" accept="image/*" required />
  <button type="submit">Upload</button>
</form>
```

---

## 🔧 Configuration

### Changer la taille max

Modifier `backend/src/middlewares/uploadMiddleware.js:45`

```javascript
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});
```

### Changer le dossier de stockage

Modifier `backend/src/middlewares/uploadMiddleware.js:6`

```javascript
const uploadsDir = path.join(__dirname, '../../uploads/products');
```

---

## 🧹 Maintenance

### Supprimer les images orphelines

Images qui ne sont plus liées à aucun produit :

```bash
# Liste les images orphelines
cd backend/uploads/products
for file in *; do
  if ! psql -U flexpos_user -d flexpos_db -tAc \
    "SELECT 1 FROM products WHERE image_path LIKE '%$file%'"; then
    echo "Orpheline: $file"
  fi
done
```

---

## ✅ Tests

### Test d'upload

```bash
# 1. Créer un produit
PRODUCT_ID=$(curl -X POST https://api.flexpos.app/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price_ht":10,"vat_rate":20,"category":"test"}' \
  | jq -r '.data.id')

# 2. Upload image
curl -X POST https://api.flexpos.app/api/products/$PRODUCT_ID/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test_image.jpg"

# 3. Vérifier l'image
curl https://api.flexpos.app/uploads/products/<filename>

# 4. Supprimer l'image
curl -X DELETE https://api.flexpos.app/api/products/$PRODUCT_ID/image \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Monitoring

### Espace disque

```bash
# Taille totale des images
du -sh backend/uploads/products

# Nombre d'images
ls -1 backend/uploads/products | wc -l
```

### Logs

```bash
# Voir les uploads récents
docker logs flexpos_backend | grep "Image uploadée"

# Voir les suppressions
docker logs flexpos_backend | grep "Image supprimée"
```

---

## 🐛 Dépannage

### Erreur "Cannot create directory"

Vérifier les permissions :

```bash
chmod -R 755 backend/uploads
chown -R www-data:www-data backend/uploads
```

### Erreur "File too large"

- Vérifier `uploadMiddleware.js:fileSize`
- Vérifier limite Nginx/Caddy : `client_max_body_size`

### Image ne s'affiche pas

- Vérifier que le fichier existe : `ls backend/uploads/products/`
- Vérifier que Express sert bien `/uploads` (server.js:94)
- Vérifier CORS si frontend sur domaine différent

---

## 📝 Changelog

**2025-11-20**
- ✅ Ajout champ `image_path` au modèle Product
- ✅ Middleware multer pour upload sécurisé
- ✅ Endpoints POST/DELETE pour gérer les images
- ✅ Servir les images statiquement via Express
- ✅ Migration SQL 028
- ✅ Isolation multi-tenant garantie
