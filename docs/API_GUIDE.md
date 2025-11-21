# 🔌 GUIDE API - FlexPOS

**Version :** 2.0.0
**Date :** 2025-11-20
**Base URL :** `https://api.flexpos.app`

---

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Erreurs et codes retour](#erreurs-et-codes-retour)
4. [Rate limiting](#rate-limiting)
5. [Endpoints principaux](#endpoints-principaux)
6. [Exemples d'intégration](#exemples-dintégration)
7. [Webhooks](#webhooks)

---

## 🌐 Introduction

L'API FlexPOS est une **API RESTful** permettant d'interagir avec le système de caisse de manière programmatique.

**Caractéristiques :**
- 🔐 **Authentification JWT** (JSON Web Token)
- 📊 **Format JSON** pour toutes les requêtes/réponses
- 🚀 **Rate limiting** : 100 requêtes/minute
- 🔒 **HTTPS uniquement** (TLS 1.2+)
- 🏢 **Multi-tenant** : Isolation automatique par organisation

**Environnements :**

| Environnement | URL | Usage |
|---------------|-----|-------|
| **Production** | `https://api.flexpos.app` | Données réelles |
| **Staging** | `https://staging-api.flexpos.app` | Tests pré-production |
| **Développement** | `http://localhost:3001` | Développement local |

---

## 🔐 Authentification

### Obtenir un token JWT

**Endpoint :**
```
POST /api/auth/login
```

**Requête :**
```bash
curl -X POST https://api.flexpos.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

**Réponse :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 42,
    "email": "user@example.com",
    "full_name": "Jean Dupont",
    "role": "manager",
    "organization_id": 6
  },
  "expires_at": "2025-11-21T10:30:00Z"
}
```

### Utiliser le token

**Toutes les requêtes API nécessitent le header `Authorization` :**

```bash
curl -X GET https://api.flexpos.app/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Durée de validité

- **Durée :** 24 heures
- **Refresh :** Reconnectez-vous avec `/api/auth/login`
- **Révocation :** Déconnexion via `/api/auth/logout`

### Déconnexion

```bash
curl -X POST https://api.flexpos.app/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ❌ Erreurs et codes retour

### Codes HTTP standard

| Code | Signification | Description |
|------|---------------|-------------|
| **200** | OK | Requête réussie |
| **201** | Created | Ressource créée avec succès |
| **400** | Bad Request | Données invalides |
| **401** | Unauthorized | Token manquant ou invalide |
| **403** | Forbidden | Accès refusé (rôle insuffisant) |
| **404** | Not Found | Ressource introuvable |
| **409** | Conflict | Conflit (ex: email déjà utilisé) |
| **422** | Unprocessable Entity | Validation échouée |
| **429** | Too Many Requests | Rate limit dépassé |
| **500** | Internal Server Error | Erreur serveur |

### Format des erreurs

**Structure standard :**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

### Codes d'erreur métier

| Code | Signification |
|------|---------------|
| `INVALID_CREDENTIALS` | Email ou mot de passe incorrect |
| `TOKEN_EXPIRED` | Token JWT expiré |
| `ORGANIZATION_SUSPENDED` | Organisation suspendue |
| `NF525_IMMUTABLE` | Modification interdite (NF525) |
| `DUPLICATE_ENTRY` | Entrée déjà existante |
| `INSUFFICIENT_PERMISSIONS` | Rôle insuffisant |

---

## 🚦 Rate limiting

### Limites par défaut

| Plan | Limite | Fenêtre |
|------|--------|---------|
| **Starter** | 100 req/min | 60 secondes |
| **Pro** | 500 req/min | 60 secondes |
| **Business** | 2000 req/min | 60 secondes |
| **Enterprise** | 10000 req/min | 60 secondes |

### Headers de réponse

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1732118460
```

### Dépassement de limite

**Réponse HTTP 429 :**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 42 seconds.",
    "retry_after": 42
  }
}
```

**Bonne pratique :** Respectez le header `Retry-After` avant de réessayer.

---

## 📡 Endpoints principaux

### Produits

#### GET /api/products

**Liste tous les produits de votre organisation**

```bash
curl -X GET "https://api.flexpos.app/api/products?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Paramètres de requête :**
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre par page (défaut: 50, max: 100)
- `category_id` (optionnel) : Filtrer par catégorie
- `search` (optionnel) : Recherche par nom

**Réponse :**
```json
{
  "total": 142,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "id": 1,
      "name": "Café expresso",
      "price_ttc": "2.50",
      "price_ht": "2.27",
      "tax_rate": "10.0",
      "category_id": 1,
      "barcode": "3760123456789",
      "image_url": "/uploads/products/org_6_prod_1_1732118400000.jpg",
      "is_active": true,
      "created_at": "2025-11-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/products

**Créer un nouveau produit**

```bash
curl -X POST https://api.flexpos.app/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Croissant",
    "price_ttc": 1.50,
    "tax_rate": 5.5,
    "category_id": 2,
    "barcode": "3760987654321"
  }'
```

**Champs requis :**
- `name` : Nom du produit
- `price_ttc` : Prix TTC en euros
- `tax_rate` : Taux de TVA (5.5, 10.0, ou 20.0)

**Champs optionnels :**
- `category_id` : ID de la catégorie
- `barcode` : Code-barres (EAN13, EAN8)
- `description` : Description texte

**Réponse :**
```json
{
  "id": 143,
  "name": "Croissant",
  "price_ttc": "1.50",
  "price_ht": "1.42",
  "tax_rate": "5.5",
  "created_at": "2025-11-20T14:30:00Z"
}
```

#### PUT /api/products/:id

**Modifier un produit**

```bash
curl -X PUT https://api.flexpos.app/api/products/143 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Croissant au beurre",
    "price_ttc": 1.80
  }'
```

#### DELETE /api/products/:id

**Supprimer un produit**

```bash
curl -X DELETE https://api.flexpos.app/api/products/143 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse :**
```json
{
  "message": "Product deleted successfully"
}
```

---

### Ventes

#### GET /api/sales

**Liste toutes les ventes**

```bash
curl -X GET "https://api.flexpos.app/api/sales?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Paramètres de requête :**
- `start_date` : Date de début (format: YYYY-MM-DD)
- `end_date` : Date de fin
- `payment_method` : CASH, CARD, MEAL_VOUCHER, MIXED
- `page`, `limit` : Pagination

**Réponse :**
```json
{
  "total": 1245,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "id": 8542,
      "ticket_number": "T-20251120-0042",
      "total_ttc": "15.00",
      "total_ht": "12.50",
      "total_tax": "2.50",
      "payment_method": "CARD",
      "cashier_id": 12,
      "cashier_name": "Marie Dupont",
      "items_count": 3,
      "created_at": "2025-11-20T14:35:12Z",
      "items": [
        {
          "product_id": 1,
          "product_name": "Café",
          "quantity": 2,
          "unit_price_ttc": "2.50",
          "total_ttc": "5.00",
          "tax_rate": "10.0"
        }
      ]
    }
  ]
}
```

#### POST /api/sales

**Créer une vente**

```bash
curl -X POST https://api.flexpos.app/api/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price_ttc": 2.50
      },
      {
        "product_id": 5,
        "quantity": 1,
        "unit_price_ttc": 8.50
      }
    ],
    "payment_method": "CARD"
  }'
```

**Réponse :**
```json
{
  "id": 8543,
  "ticket_number": "T-20251120-0043",
  "total_ttc": "13.50",
  "total_ht": "11.25",
  "total_tax": "2.25",
  "payment_method": "CARD",
  "created_at": "2025-11-20T15:00:00Z",
  "hash_signature": "a3f8c9d2e1b4f7c5a8e3d6b9c2f1a4e7"
}
```

**⚠️ IMPORTANT :** Les ventes **ne peuvent PAS être modifiées** après création (conformité NF525).

#### GET /api/sales/:id

**Détail d'une vente**

```bash
curl -X GET https://api.flexpos.app/api/sales/8542 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Rapports Z (Daily Reports)

#### POST /api/daily-reports/generate

**Générer le rapport Z quotidien**

```bash
curl -X POST https://api.flexpos.app/api/daily-reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_date": "2025-11-20"
  }'
```

**Réponse :**
```json
{
  "id": 12,
  "organization_id": 6,
  "report_date": "2025-11-20",
  "total_sales_count": 47,
  "total_amount_ttc": "1850.50",
  "total_amount_ht": "1542.08",
  "total_tax": "308.42",
  "total_cash": "450.00",
  "total_card": "1200.50",
  "total_meal_voucher": "200.00",
  "total_mixed": "0.00",
  "vat_breakdown": {
    "5.5": "15.20",
    "10.0": "83.22",
    "20.0": "210.00"
  },
  "first_ticket_number": "T-20251120-0001",
  "last_ticket_number": "T-20251120-0047",
  "first_hash_sequence": 1523,
  "last_hash_sequence": 1569,
  "signature_hash": "b4815bb67bf19cf8f41e3b1bcdef7935664327c78ed0161866736bf5842ecf52",
  "status": "generated",
  "created_at": "2025-11-20T23:00:00Z"
}
```

#### GET /api/daily-reports

**Liste des rapports Z**

```bash
curl -X GET "https://api.flexpos.app/api/daily-reports?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### GET /api/daily-reports/export/csv

**Exporter les rapports en CSV**

```bash
curl -X GET "https://api.flexpos.app/api/daily-reports/export/csv?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output rapports_z_novembre_2025.csv
```

---

### Catégories

#### GET /api/categories

**Liste des catégories**

```bash
curl -X GET https://api.flexpos.app/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse :**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Boissons chaudes",
      "color": "#FF5722",
      "icon": "coffee",
      "products_count": 12
    },
    {
      "id": 2,
      "name": "Viennoiseries",
      "color": "#FFC107",
      "icon": "croissant",
      "products_count": 8
    }
  ]
}
```

#### POST /api/categories

**Créer une catégorie**

```bash
curl -X POST https://api.flexpos.app/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Desserts",
    "color": "#E91E63",
    "icon": "cake"
  }'
```

---

### Utilisateurs

#### GET /api/users

**Liste des utilisateurs de votre organisation**

```bash
curl -X GET https://api.flexpos.app/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse :**
```json
{
  "data": [
    {
      "id": 42,
      "email": "jean.dupont@example.com",
      "full_name": "Jean Dupont",
      "role": "cashier",
      "is_active": true,
      "created_at": "2025-11-15T10:00:00Z"
    }
  ]
}
```

**Rôles disponibles :**
- `cashier` : Caissier (encaissement uniquement)
- `manager` : Manager (encaissement + produits + rapports)
- `admin` : Administrateur (tous les droits)

#### POST /api/users

**Créer un utilisateur**

**Requis :** Rôle `admin`

```bash
curl -X POST https://api.flexpos.app/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouveau@example.com",
    "full_name": "Nouveau Caissier",
    "role": "cashier",
    "password": "MotDePasse2025!"
  }'
```

---

### Images produits

#### POST /api/products/:id/image

**Upload d'une image pour un produit**

```bash
curl -X POST https://api.flexpos.app/api/products/1/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/photo.jpg"
```

**Réponse :**
```json
{
  "success": true,
  "image_url": "/uploads/products/org_6_prod_1_1732118400000.jpg",
  "full_url": "https://api.flexpos.app/uploads/products/org_6_prod_1_1732118400000.jpg"
}
```

**Contraintes :**
- **Formats :** JPEG, PNG, WebP, GIF
- **Taille max :** 5 MB
- **Résolution recommandée :** 800x800 pixels

---

## 💡 Exemples d'intégration

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const API_URL = 'https://api.flexpos.app';
let token = null;

// 1. Authentification
async function login(email, password) {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email,
    password
  });
  token = response.data.token;
  return token;
}

// 2. Créer une vente
async function createSale(items, paymentMethod) {
  const response = await axios.post(`${API_URL}/api/sales`, {
    items,
    payment_method: paymentMethod
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
}

// 3. Générer rapport Z
async function generateDailyReport(date) {
  const response = await axios.post(`${API_URL}/api/daily-reports/generate`, {
    report_date: date
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
}

// Utilisation
(async () => {
  await login('user@example.com', 'password');

  const sale = await createSale([
    { product_id: 1, quantity: 2, unit_price_ttc: 2.50 }
  ], 'CARD');

  console.log('Vente créée:', sale.ticket_number);

  const report = await generateDailyReport('2025-11-20');
  console.log('Rapport Z:', report.total_amount_ttc);
})();
```

### Python

```python
import requests
from datetime import date

API_URL = 'https://api.flexpos.app'

class FlexPOSClient:
    def __init__(self, email, password):
        self.token = None
        self.login(email, password)

    def login(self, email, password):
        response = requests.post(f'{API_URL}/api/auth/login', json={
            'email': email,
            'password': password
        })
        self.token = response.json()['token']

    def get_headers(self):
        return {'Authorization': f'Bearer {self.token}'}

    def create_sale(self, items, payment_method):
        response = requests.post(
            f'{API_URL}/api/sales',
            json={'items': items, 'payment_method': payment_method},
            headers=self.get_headers()
        )
        return response.json()

    def get_daily_report(self, report_date):
        response = requests.get(
            f'{API_URL}/api/daily-reports',
            params={'start_date': report_date, 'end_date': report_date},
            headers=self.get_headers()
        )
        return response.json()

# Utilisation
client = FlexPOSClient('user@example.com', 'password')

sale = client.create_sale([
    {'product_id': 1, 'quantity': 2, 'unit_price_ttc': 2.50}
], 'CARD')

print(f"Vente créée: {sale['ticket_number']}")
```

### PHP

```php
<?php

class FlexPOSClient {
    private $apiUrl = 'https://api.flexpos.app';
    private $token;

    public function __construct($email, $password) {
        $this->login($email, $password);
    }

    private function login($email, $password) {
        $ch = curl_init($this->apiUrl . '/api/auth/login');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'email' => $email,
            'password' => $password
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);
        $this->token = $data['token'];
    }

    public function createSale($items, $paymentMethod) {
        $ch = curl_init($this->apiUrl . '/api/sales');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'items' => $items,
            'payment_method' => $paymentMethod
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->token
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }
}

// Utilisation
$client = new FlexPOSClient('user@example.com', 'password');

$sale = $client->createSale([
    ['product_id' => 1, 'quantity' => 2, 'unit_price_ttc' => 2.50]
], 'CARD');

echo "Vente créée: " . $sale['ticket_number'];
?>
```

---

## 🔔 Webhooks

### Configuration des webhooks

Les webhooks permettent de recevoir des notifications en temps réel lors d'événements.

**Événements disponibles :**
- `sale.created` : Nouvelle vente créée
- `daily_report.generated` : Rapport Z généré
- `product.created` : Nouveau produit créé
- `product.updated` : Produit modifié
- `organization.suspended` : Organisation suspendue

**Configuration via API :**

```bash
curl -X POST https://api.flexpos.app/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/flexpos",
    "events": ["sale.created", "daily_report.generated"],
    "secret": "your_secret_key_for_signature"
  }'
```

### Payload exemple

**Événement `sale.created` :**

```json
{
  "event": "sale.created",
  "timestamp": "2025-11-20T15:30:00Z",
  "organization_id": 6,
  "data": {
    "id": 8543,
    "ticket_number": "T-20251120-0043",
    "total_ttc": "13.50",
    "payment_method": "CARD",
    "created_at": "2025-11-20T15:30:00Z"
  }
}
```

### Vérification de signature

**Header envoyé :**
```http
X-FlexPOS-Signature: sha256=a3f8c9d2e1b4f7c5a8e3d6b9c2f1a4e7...
```

**Vérification (Node.js) :**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

---

## 📞 Support API

**Documentation complète :** [https://docs.flexpos.app](https://docs.flexpos.app)

**Support technique :**
- Email : api-support@flexpos.app
- Discord : [discord.gg/flexpos](https://discord.gg/flexpos)

**Statut de l'API :** [https://status.flexpos.app](https://status.flexpos.app)

---

**Dernière mise à jour :** 2025-11-20
**Version :** 2.0.0
**Statut :** ✅ PRODUCTION READY
