# 🎯 PROCHAINES ÉTAPES - FlexPOS MVP

**Mis à jour :** 2025-11-19
**Statut Actuel :** ⚠️ Score Global 87.5/100 - Finalisation requise avant production

---

## 🔥 URGENT - À FAIRE MAINTENANT (2-3h)

### 1. Finaliser Audit Multi-Tenant

#### A. Audit Base de Données (45min)
```bash
# Le script existe mais nécessite accès PostgreSQL
# Solution : Exécuter dans le container Docker

# Copier le script dans le container
docker cp scripts/audit-multi-tenant-schema.js flexpos-backend:/tmp/

# Installer dépendances dans container (si nécessaire)
docker exec -it flexpos-backend npm install sequelize pg dotenv

# Exécuter l'audit
docker exec -it flexpos-backend node /tmp/audit-multi-tenant-schema.js

# Récupérer le rapport
docker cp flexpos-backend:/app/docs/task-reports/2025-11-19-audit-multi-tenant---schéma-bdd.md docs/task-reports/
```

**Objectif :** Vérifier que les 11+ tables ont bien `organization_id NOT NULL` avec FK et index.

**Résultat Attendu :** ✅ "Schéma multi-tenant CONFORME"

---

#### B. Tests d'Intrusion (1h)

```bash
# 1. Debug pourquoi /api/public/signup redirige
curl -v -X POST https://api.flexpos.app/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{"restaurantName":"Test","email":"test@test.com","password":"Test1234!","plan":"free"}'

# 2. Vérifier routing dans backend
grep -r "public/signup" backend/src/routes/

# 3. Si nécessaire, corriger le routing

# 4. Re-exécuter tests d'intrusion
API_URL=https://api.flexpos.app node scripts/audit-multi-tenant-intrusion.js
```

**Objectif :** Valider qu'aucune faille cross-org n'existe via tests automatisés.

**Résultat Attendu :** ✅ "ISOLATION MULTI-TENANT VALIDÉE - Tous tests réussis"

---

#### C. Tests Unitaires (30min)

```bash
# Créer tests pour les 3 corrections de sécurité
cat > backend/tests/security/multi-tenant.test.js << 'EOF'
const request = require('supertest');
const app = require('../../src/server');

describe('Multi-Tenant Security', () => {
  let org1Token, org2Token, org1ProductId;

  beforeAll(async () => {
    // Setup: Créer 2 orgs + produit dans org1
  });

  it('should NOT allow cross-org product access (getProductsByCategory)', async () => {
    const res = await request(app)
      .get('/api/products/category/Boissons')
      .set('Authorization', `Bearer ${org2Token}`);

    expect(res.body.data.find(p => p.id === org1ProductId)).toBeUndefined();
  });

  it('should NOT allow cross-org product update (updateProductsOrder)', async () => {
    const res = await request(app)
      .put('/api/products/order')
      .set('Authorization', `Bearer ${org2Token}`)
      .send({ products: [{ id: org1ProductId, display_order: 999 }] });

    // Vérifier que le produit de org1 n'a pas été modifié
    const check = await request(app)
      .get(`/api/products/${org1ProductId}`)
      .set('Authorization', `Bearer ${org1Token}`);

    expect(check.body.data.display_order).not.toBe(999);
  });

  it('should NOT include cross-org products in CSV export', async () => {
    const res = await request(app)
      .get('/api/products/export/csv')
      .set('Authorization', `Bearer ${org2Token}`);

    expect(res.text).not.toContain(org1ProductId);
  });
});
EOF

# Exécuter tests
cd backend
npm test -- tests/security/multi-tenant.test.js
```

**Objectif :** Prévenir régressions futures.

---

## 🟠 IMPORTANT - Audit NF525 (3-4h)

### 1. Vérifier Hash Chains (1h30)

```bash
# Créer script de vérification
cat > scripts/audit-nf525-hash-chains.js << 'EOF'
const { sequelize } = require('../backend/src/config/database');
const { HashChain } = require('../backend/src/models');

async function auditHashChains() {
  console.log('🔐 AUDIT NF525 - Hash Chains\n');

  // 1. Vérifier qu'il existe des hash chains
  const count = await HashChain.count();
  console.log(`Nombre de hash chains: ${count}`);

  if (count === 0) {
    console.log('❌ AUCUN hash chain trouvé - NF525 non fonctionnel !');
    return;
  }

  // 2. Vérifier le chaînage (chaque hash contient le précédent)
  const chains = await HashChain.findAll({
    order: [['sequence_number', 'ASC']],
    limit: 100
  });

  let errors = 0;
  for (let i = 1; i < chains.length; i++) {
    const prev = chains[i-1];
    const curr = chains[i];

    // Vérifier que current_hash de curr est lié à prev
    // (La logique exacte dépend de votre implémentation)
    if (curr.previous_hash !== prev.current_hash) {
      console.log(`❌ ERREUR: Chaîne brisée entre #${prev.sequence_number} et #${curr.sequence_number}`);
      errors++;
    }
  }

  if (errors === 0) {
    console.log('✅ Hash chains VALIDES - Chaînage intact');
  } else {
    console.log(`❌ ${errors} erreur(s) de chaînage détectée(s)`);
  }

  // 3. Vérifier inaltérabilité (vente ne peut pas être modifiée)
  // TODO: Tenter de modifier une vente et vérifier que c'est bloqué

  await sequelize.close();
}

auditHashChains().catch(console.error);
EOF

# Exécuter (dans Docker si nécessaire)
node scripts/audit-nf525-hash-chains.js
```

**Objectif :** Confirmer que les ventes sont inaltérables et chaînées.

---

### 2. Tester Inaltérabilité (30min)

```bash
# Test manuel
# 1. Créer une vente via l'app
# 2. Tenter de la modifier dans la BDD directement
docker exec -it flexpos-db psql -U postgres -d flexpos -c \
  "UPDATE sales SET total_ttc = 999.99 WHERE id = 1;"

# 3. Vérifier que l'app détecte la modification (hash invalide)
curl https://api.flexpos.app/api/sales/1 -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat Attendu :** L'app doit signaler que le hash ne correspond plus.

---

### 3. Préparer Certification (1h)

**Documents Nécessaires :**
- [ ] Architecture technique NF525
- [ ] Code source (hash_chains, nf525Service)
- [ ] Tests de validation
- [ ] Procédures archivage
- [ ] Garanties constructeur

**Organismes Certifiés :**
- INFOCERT (leader en France)
- LSTI
- Certinomis

**Démarches :**
1. Contacter organisme
2. Fournir dossier technique
3. Tests de conformité
4. Obtenir attestation
5. Renouveler annuellement

**Coût Estimé :** 500-2000€

---

## 🟢 DÉVELOPPEMENT - Finaliser MVP (8-12h)

### 1. Landing Page (3-4h)

**Structure :**
```
frontend-landing/
├── src/
│   ├── pages/
│   │   ├── Home.jsx           // Hero + Features + Testimonials + CTA
│   │   ├── Pricing.jsx        // Plans Free/Pro/Enterprise
│   │   ├── Features.jsx       // Détail fonctionnalités
│   │   ├── Contact.jsx        // Formulaire contact
│   │   └── Legal.jsx          // CGV, Mentions légales, RGPD
│   ├── components/
│   │   ├── Hero.jsx
│   │   ├── FeatureCard.jsx
│   │   ├── PricingCard.jsx
│   │   ├── Testimonial.jsx
│   │   ├── ContactForm.jsx
│   │   └── Footer.jsx
│   └── App.jsx
└── package.json
```

**Technologies :**
- React + Vite
- TailwindCSS
- React Router
- Framer Motion (animations)
- React Hook Form (formulaires)

**Commandes :**
```bash
cd frontend-landing
npm create vite@latest . -- --template react
npm install -D tailwindcss postcss autoprefixer
npm install react-router-dom framer-motion react-hook-form
npm run dev
```

**Déploiement :**
- Build : `npm run build`
- Upload vers `frontend-landing/dist`
- Caddy reverse proxy : ✅ Déjà configuré (www.flexpos.app)

---

### 2. Admin Dashboard (4-5h)

**Structure :**
```
frontend-admin/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx      // Stats globales multi-org
│   │   ├── Organizations.jsx  // Liste + CRUD organisations
│   │   ├── OrganizationDetail.jsx  // Détail + users + stats
│   │   ├── Users.jsx          // Gestion users multi-org
│   │   ├── Analytics.jsx      // Graphiques + rapports
│   │   ├── Subscriptions.jsx  // Gestion abonnements + facturation
│   │   └── Settings.jsx       // Config globale FlexPOS
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── StatCard.jsx
│   │   ├── OrganizationTable.jsx
│   │   ├── UserTable.jsx
│   │   ├── Chart.jsx
│   │   └── Modal.jsx
│   └── services/
│       └── adminApi.js        // Calls vers /api/admin/*
└── package.json
```

**Technologies :**
- React + Vite
- TailwindCSS
- React Router
- Recharts / Chart.js (graphiques)
- TanStack Table (tables avancées)
- Zustand (state management)

**Backend Routes Requises :**
```javascript
// backend/src/routes/admin.js (à créer)
router.get('/organizations', adminAuth, getOrganizations);
router.get('/organizations/:id', adminAuth, getOrganizationDetail);
router.put('/organizations/:id', adminAuth, updateOrganization);
router.get('/users', adminAuth, getAllUsersMultiOrg);
router.get('/analytics', adminAuth, getGlobalAnalytics);
router.get('/subscriptions', adminAuth, getSubscriptions);
```

**Déploiement :**
- Build : `npm run build`
- Upload vers `frontend-admin/dist`
- Caddy reverse proxy : ✅ Déjà configuré (admin.flexpos.app)

---

### 3. Upload Images Produits (1-2h)

#### A. Backend - Endpoint Upload

```javascript
// backend/src/routes/products.js
const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// Config Cloudinary (ou S3)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Route upload
router.post('/:id/upload-image',
  authenticateToken,
  requirePermission('products:update'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Vérifier produit existe et appartient à l'org
      const product = await Product.findOne({
        where: { id, organization_id: req.organizationId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      // Resize image avec Sharp
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload vers Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'flexpos/products' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(resizedBuffer);
      });

      // Mettre à jour produit
      await product.update({ image_url: result.secure_url });

      res.json({
        success: true,
        data: { image_url: result.secure_url }
      });
    } catch (error) {
      logger.error('Erreur upload image:', error);
      res.status(500).json({ error: 'Erreur upload image' });
    }
  }
);
```

**Dépendances :**
```bash
cd backend
npm install multer sharp cloudinary
```

**Variables d'environnement (.env) :**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

#### B. Frontend - Composant Upload

```jsx
// frontend/src/components/ImageUpload.jsx
import { useState } from 'react';
import axios from 'axios';

export default function ImageUpload({ productId, currentImageUrl, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview local
    setPreview(URL.createObjectURL(file));

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await axios.post(
        `/api/products/${productId}/upload-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPreview(res.data.data.image_url);
      onUploadSuccess(res.data.data.image_url);
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
        {preview ? (
          <img src={preview} alt="Produit" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Aucune image
          </div>
        )}
      </div>

      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <span className="btn btn-secondary cursor-pointer">
          {uploading ? 'Upload en cours...' : 'Changer l\'image'}
        </span>
      </label>
    </div>
  );
}
```

**Intégration :**
```jsx
// Dans ProductForm.jsx
<ImageUpload
  productId={product.id}
  currentImageUrl={product.image_url}
  onUploadSuccess={(url) => setProduct({ ...product, image_url: url })}
/>
```

---

## 📋 CHECKLIST COMPLÈTE AVANT PRODUCTION

### Sécurité (100% Requis)
- [x] 3 failles multi-tenant corrigées
- [ ] Audit BDD exécuté et validé
- [ ] Tests d'intrusion réussis
- [ ] Tests unitaires sécurité créés
- [ ] npm audit réussi (0 vulnérabilités high/critical)
- [ ] Secrets validés (pas de .env dans Git)

### Conformité NF525 (100% Requis)
- [x] Hash chains implémentés
- [ ] Hash chains testés et validés
- [ ] Inaltérabilité confirmée
- [ ] Archives NF525 fonctionnelles
- [ ] Certification obtenue

### MVP Fonctionnel (100% Requis)
- [x] Backend API : 95%
- [x] Frontend POS : 90%
- [ ] Landing Page : 100%
- [ ] Admin Dashboard : 100%
- [ ] Upload Images : 100%
- [ ] Tests E2E réussis

### Infrastructure (80% Recommandé)
- [x] Docker configuré
- [x] Caddy configuré
- [x] HTTPS enforced
- [x] SSL auto (Let's Encrypt)
- [ ] Backup BDD automatisé
- [ ] Monitoring (logs, métriques)
- [ ] Alerting configuré

### Documentation (80% Recommandé)
- [x] README.md
- [x] ARCHITECTURE.md
- [x] Audit sécurité
- [ ] Guide déploiement
- [ ] Guide utilisateur
- [ ] API documentation (Swagger)
- [ ] SECURITY.md

---

## 🚀 COMMANDES UTILES

### Audits
```bash
# Audit controllers
node scripts/audit-multi-tenant-controllers.js

# Dashboard progression
node scripts/generate-progress-dashboard.js

# Audit BDD (dans Docker)
docker exec -it flexpos-backend node scripts/audit-multi-tenant-schema.js

# Tests intrusion
API_URL=https://api.flexpos.app node scripts/audit-multi-tenant-intrusion.js
```

### Développement
```bash
# Backend
cd backend && npm run dev

# Frontend POS
cd frontend && npm run dev

# Frontend Landing (à créer)
cd frontend-landing && npm run dev

# Frontend Admin (à créer)
cd frontend-admin && npm run dev
```

### Production
```bash
# Build tout
docker-compose -f docker-compose.prod.yml build

# Démarrer
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f

# Restart après modif
docker-compose restart backend frontend
```

---

## 📊 ESTIMATION TEMPS RESTANT

| Tâche | Durée | Priorité |
|-------|-------|----------|
| Audit BDD | 45min | 🔥 URGENT |
| Tests intrusion | 1h | 🔥 URGENT |
| Tests unitaires | 30min | 🔥 URGENT |
| Audit NF525 | 3-4h | 🔴 CRITIQUE |
| Landing Page | 3-4h | 🟠 IMPORTANT |
| Admin Dashboard | 4-5h | 🟠 IMPORTANT |
| Upload Images | 1-2h | 🟡 NORMAL |
| Tests E2E | 2h | 🟡 NORMAL |
| **TOTAL** | **15-21h** | **2-3 jours** |

---

## ✅ VALIDATION FINALE

**FlexPOS sera prêt pour production quand :**

✅ **Sécurité :** Score 100/100 multi-tenant (tests complets)
✅ **Conformité :** Certification NF525 obtenue
✅ **MVP :** Landing + Admin + Upload fonctionnels
✅ **Tests :** E2E réussis sur tous parcours
✅ **Docs :** Complète et à jour

**Estimation Go Live :** Dans 2-3 jours si travail à temps plein

---

**Courage ! Le plus dur est fait. L'architecture est solide, il ne reste "que" les finitions ! 🚀**
