# Documentation API - POS Burger

## 🔗 URL de Base

- **Développement** : `http://localhost:3000/api`
- **Production** : `https://pos.bensburger.com/api`

## 🔐 Authentification

L'API utilise JWT (JSON Web Token) pour l'authentification.

### Header requis
```
Authorization: Bearer <token>
```

### Obtenir un token
```http
POST /api/auth/login
```

---

## 📚 Endpoints

## 1. Authentification

### POST /api/auth/login
Connexion par code PIN.

**Body** :
```json
{
  "username": "john",
  "pin_code": "1234"
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "john",
      "role": "cashier",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Erreurs** :
- `400` : Champs manquants
- `401` : Identifiants invalides
- `403` : Compte désactivé

---

### POST /api/auth/logout
Déconnexion (invalidation token côté client).

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

### GET /api/auth/me
Récupérer les infos de l'utilisateur connecté.

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john",
    "role": "cashier",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

---

## 2. Produits

### GET /api/products
Liste tous les produits actifs.

**Query Parameters** :
- `category` (optionnel) : burgers | sides | drinks | desserts | menus
- `is_menu` (optionnel) : true | false
- `include_inactive` (optionnel, admin only) : true | false

**Exemple** :
```
GET /api/products?category=burgers
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Burger Classic",
      "description": "Steak, salade, tomate, oignons",
      "price_ht": 8.26,
      "price_ttc": 9.09,
      "vat_rate": 10.0,
      "category": "burgers",
      "image_url": "/images/burger-classic.jpg",
      "is_active": true,
      "is_menu": false,
      "display_order": 1
    },
    {
      "id": 2,
      "name": "Burger Bacon",
      "price_ht": 9.09,
      "price_ttc": 10.00,
      "vat_rate": 10.0,
      "category": "burgers",
      "is_active": true,
      "is_menu": false
    }
  ]
}
```

---

### GET /api/products/:id
Détail d'un produit.

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Burger Classic",
    "price_ht": 8.26,
    "price_ttc": 9.09,
    "vat_rate": 10.0,
    "category": "burgers",
    "is_menu": false,
    "menu_composition": null
  }
}
```

**Pour un menu** :
```json
{
  "success": true,
  "data": {
    "id": 50,
    "name": "Menu XL",
    "price_ht": 11.00,
    "price_ttc": 12.10,
    "vat_rate": 10.0,
    "category": "menus",
    "is_menu": true,
    "menu_composition": [
      {
        "product_id": 1,
        "product_name": "Burger Classic",
        "quantity": 1
      },
      {
        "product_id": 15,
        "product_name": "Frites",
        "quantity": 1
      },
      {
        "product_id": 20,
        "product_name": "Coca-Cola",
        "quantity": 1
      }
    ]
  }
}
```

**Erreurs** :
- `404` : Produit non trouvé

---

### POST /api/products
Créer un nouveau produit (admin only).

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "name": "Burger Végétarien",
  "description": "Steak végétal, crudités",
  "price_ht": 7.50,
  "vat_rate": 10.0,
  "category": "burgers",
  "image_url": "/images/burger-vege.jpg",
  "is_active": true,
  "is_menu": false,
  "display_order": 5
}
```

**Réponse** (201) :
```json
{
  "success": true,
  "data": {
    "id": 25,
    "name": "Burger Végétarien",
    "price_ht": 7.50,
    "price_ttc": 8.25,
    "vat_rate": 10.0,
    "category": "burgers"
  },
  "message": "Produit créé avec succès"
}
```

**Erreurs** :
- `400` : Validation échouée
- `403` : Accès refusé (pas admin)

---

### PUT /api/products/:id
Modifier un produit (admin only).

**Headers** : `Authorization: Bearer <token>`

**Body** (champs modifiables) :
```json
{
  "name": "Burger Végétarien BIO",
  "price_ht": 8.00,
  "is_active": false
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": 25,
    "name": "Burger Végétarien BIO",
    "price_ht": 8.00,
    "price_ttc": 8.80
  },
  "message": "Produit modifié avec succès"
}
```

---

### DELETE /api/products/:id
Supprimer un produit (soft delete, admin only).

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "message": "Produit supprimé avec succès"
}
```

**Erreurs** :
- `400` : Produit utilisé dans des ventes
- `403` : Accès refusé
- `404` : Produit non trouvé

---

### GET /api/products/category/:category
Produits par catégorie (raccourci).

**Exemple** :
```
GET /api/products/category/burgers
```

**Réponse** : Identique à `GET /api/products?category=burgers`

---

## 3. Ventes

### POST /api/sales
Créer une nouvelle vente.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price_ht": 8.26,
      "vat_rate": 10.0
    },
    {
      "product_id": 15,
      "quantity": 1,
      "unit_price_ht": 2.50,
      "vat_rate": 10.0
    }
  ],
  "payment_method": "cash",
  "amount_paid": 25.00,
  "payment_details": null
}
```

**Calculs automatiques côté backend** :
- `total_ht`, `total_ttc` par item
- `total_ht`, `total_ttc` global
- `vat_details` (récapitulatif par taux)
- `change_given` (si espèces)
- `ticket_number` (séquentiel)

**Réponse** (201) :
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "ticket_number": "20250110-0042",
    "total_ht": 16.52,
    "total_ttc": 18.17,
    "vat_details": {
      "10.0": {
        "base_ht": 16.52,
        "amount_vat": 1.65,
        "total_ttc": 18.17
      }
    },
    "payment_method": "cash",
    "amount_paid": 25.00,
    "change_given": 6.83,
    "items": [
      {
        "product_name": "Burger Classic",
        "quantity": 2,
        "unit_price_ht": 8.26,
        "total_ttc": 18.18
      }
    ],
    "created_at": "2025-01-10T14:23:45.000Z"
  },
  "message": "Vente enregistrée avec succès"
}
```

**Paiement mixte** :
```json
{
  "items": [...],
  "payment_method": "mixed",
  "amount_paid": 45.50,
  "payment_details": {
    "cash": 20.00,
    "card": 15.50,
    "meal_voucher": 10.00
  }
}
```

**Erreurs** :
- `400` : Panier vide, montant insuffisant, produit inactif
- `404` : Produit non trouvé
- `500` : Erreur transaction BDD

---

### GET /api/sales
Liste des ventes (avec filtres).

**Headers** : `Authorization: Bearer <token>`

**Query Parameters** :
- `start_date` : Date début (ISO 8601, ex: 2025-01-10)
- `end_date` : Date fin
- `user_id` : Filtrer par caissier (admin only)
- `payment_method` : cash | card | meal_voucher | mixed
- `status` : completed | cancelled | refunded
- `limit` : Nombre de résultats (défaut: 50, max: 200)
- `offset` : Pagination

**Exemple** :
```
GET /api/sales?start_date=2025-01-10&payment_method=cash&limit=20
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "id": 1234,
        "ticket_number": "20250110-0042",
        "total_ttc": 18.17,
        "payment_method": "cash",
        "created_at": "2025-01-10T14:23:45.000Z",
        "user": {
          "id": 1,
          "username": "john"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

---

### GET /api/sales/:id
Détail complet d'une vente.

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "ticket_number": "20250110-0042",
    "total_ht": 16.52,
    "total_ttc": 18.17,
    "vat_details": {
      "10.0": {
        "base_ht": 16.52,
        "amount_vat": 1.65,
        "total_ttc": 18.17
      }
    },
    "payment_method": "cash",
    "amount_paid": 25.00,
    "change_given": 6.83,
    "status": "completed",
    "items": [
      {
        "product_name": "Burger Classic",
        "quantity": 2,
        "unit_price_ht": 8.26,
        "vat_rate": 10.0,
        "total_ht": 16.52,
        "total_ttc": 18.17
      }
    ],
    "user": {
      "id": 1,
      "username": "john",
      "first_name": "John"
    },
    "created_at": "2025-01-10T14:23:45.000Z"
  }
}
```

---

### GET /api/sales/:id/ticket
Régénérer le ticket de caisse (pour réimpression).

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "ticket_number": "20250110-0042",
    "content": "BENSBURGER\n123 Rue...\n\n...",
    "format": "text/plain"
  }
}
```

---

### POST /api/sales/:id/print
Réimprimer un ticket.

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "message": "Ticket envoyé à l'imprimante"
}
```

**Erreurs** :
- `503` : Imprimante indisponible

---

### POST /api/sales/:id/cancel
Annuler une vente (admin only, avec justification).

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "reason": "Erreur de saisie"
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "message": "Vente annulée"
}
```

**Contraintes** :
- Seulement si vente < 24h
- Nécessite caisse ouverte
- Crée audit log

---

## 4. Caisse

### GET /api/cash-register/current
Récupérer la caisse ouverte de l'utilisateur connecté.

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": 42,
    "user_id": 1,
    "opening_amount": 100.00,
    "expected_cash": 450.00,
    "total_sales": 1250.50,
    "total_cash": 350.00,
    "total_card": 800.50,
    "total_meal_voucher": 100.00,
    "ticket_count": 87,
    "status": "open",
    "opened_at": "2025-01-10T08:00:00.000Z"
  }
}
```

**Si aucune caisse ouverte** (404) :
```json
{
  "success": false,
  "message": "Aucune caisse ouverte"
}
```

---

### POST /api/cash-register/open
Ouvrir une nouvelle caisse.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "opening_amount": 100.00
}
```

**Réponse** (201) :
```json
{
  "success": true,
  "data": {
    "id": 43,
    "user_id": 1,
    "opening_amount": 100.00,
    "status": "open",
    "opened_at": "2025-01-10T08:00:00.000Z"
  },
  "message": "Caisse ouverte avec succès"
}
```

**Erreurs** :
- `400` : Caisse déjà ouverte pour cet utilisateur

---

### POST /api/cash-register/close
Clôturer la caisse.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "actual_cash": 448.50,
  "closing_report": {
    "bills": {
      "200": 1,
      "50": 2,
      "20": 5,
      "10": 10,
      "5": 8
    },
    "coins": {
      "2": 10,
      "1": 15,
      "0.5": 20,
      "0.2": 12,
      "0.1": 5
    }
  }
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": 42,
    "closing_amount": 448.50,
    "expected_cash": 450.00,
    "actual_cash": 448.50,
    "cash_difference": -1.50,
    "total_sales": 1250.50,
    "ticket_count": 87,
    "status": "closed",
    "closed_at": "2025-01-10T18:30:00.000Z",
    "closing_hash": "a3f5e8d9c2b1..."
  },
  "message": "Caisse clôturée avec succès"
}
```

**Alertes si écart** :
```json
{
  "success": true,
  "data": {...},
  "warnings": [
    "Écart de caisse détecté : -1.50€"
  ]
}
```

---

### GET /api/cash-register/report
Ticket X (rapport sans clôture).

**Headers** : `Authorization: Bearer <token>`

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "opened_at": "2025-01-10T08:00:00.000Z",
    "opening_amount": 100.00,
    "total_sales": 1250.50,
    "total_cash": 350.00,
    "total_card": 800.50,
    "total_meal_voucher": 100.00,
    "expected_cash": 450.00,
    "ticket_count": 87,
    "sales_by_category": {
      "burgers": 650.00,
      "sides": 200.00,
      "drinks": 300.50,
      "desserts": 100.00
    }
  }
}
```

---

### GET /api/cash-register/history
Historique des clôtures (admin only).

**Headers** : `Authorization: Bearer <token>`

**Query Parameters** :
- `user_id` : Filtrer par caissier
- `start_date`, `end_date` : Période
- `limit`, `offset` : Pagination

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "closings": [
      {
        "id": 42,
        "user": {
          "id": 1,
          "username": "john"
        },
        "opened_at": "2025-01-10T08:00:00.000Z",
        "closed_at": "2025-01-10T18:30:00.000Z",
        "total_sales": 1250.50,
        "cash_difference": -1.50
      }
    ]
  }
}
```

---

## 5. Dashboard (Admin)

### GET /api/dashboard/today
Statistiques du jour.

**Headers** : `Authorization: Bearer <token>` (admin only)

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "date": "2025-01-10",
    "total_revenue": 2450.75,
    "ticket_count": 156,
    "avg_basket": 15.71,
    "payment_methods": {
      "cash": 850.00,
      "card": 1400.75,
      "meal_voucher": 200.00
    },
    "top_products": [
      {
        "product_name": "Burger Classic",
        "quantity": 45,
        "revenue": 409.05
      },
      {
        "product_name": "Frites",
        "quantity": 89,
        "revenue": 267.00
      }
    ],
    "sales_by_category": {
      "burgers": 1200.00,
      "sides": 500.00,
      "drinks": 600.75,
      "desserts": 150.00
    },
    "hourly_sales": [
      { "hour": 11, "revenue": 245.50, "tickets": 18 },
      { "hour": 12, "revenue": 678.25, "tickets": 42 },
      { "hour": 13, "revenue": 523.00, "tickets": 35 }
    ]
  }
}
```

---

### GET /api/dashboard/period
Statistiques sur une période.

**Headers** : `Authorization: Bearer <token>` (admin only)

**Query Parameters** :
- `start_date` : Date début (requis)
- `end_date` : Date fin (requis)

**Exemple** :
```
GET /api/dashboard/period?start_date=2025-01-01&end_date=2025-01-10
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-10",
    "total_revenue": 18567.45,
    "ticket_count": 1234,
    "avg_basket": 15.05,
    "daily_breakdown": [
      {
        "date": "2025-01-01",
        "revenue": 1856.50,
        "tickets": 124
      }
    ]
  }
}
```

---

### GET /api/dashboard/top-products
Top produits vendus.

**Headers** : `Authorization: Bearer <token>` (admin only)

**Query Parameters** :
- `period` : today | week | month (défaut: today)
- `limit` : Nombre de produits (défaut: 10)

**Réponse** (200) :
```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "product_name": "Burger Classic",
      "quantity": 245,
      "revenue": 2227.05,
      "percentage": 12.5
    }
  ]
}
```

---

## 📋 Codes de Statut HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès (GET, PUT, DELETE) |
| 201 | Ressource créée (POST) |
| 400 | Erreur de validation |
| 401 | Non authentifié |
| 403 | Accès refusé (permissions) |
| 404 | Ressource non trouvée |
| 409 | Conflit (ex: caisse déjà ouverte) |
| 422 | Erreur métier (ex: montant insuffisant) |
| 500 | Erreur serveur |
| 503 | Service indisponible (ex: imprimante) |

---

## 🔒 Permissions par Rôle

| Endpoint | Admin | Caissier |
|----------|-------|----------|
| POST /api/auth/login | ✅ | ✅ |
| GET /api/products | ✅ | ✅ |
| POST /api/products | ✅ | ❌ |
| PUT /api/products/:id | ✅ | ❌ |
| DELETE /api/products/:id | ✅ | ❌ |
| POST /api/sales | ✅ | ✅ |
| GET /api/sales | ✅ | ✅ (ses ventes) |
| POST /api/sales/:id/cancel | ✅ | ❌ |
| POST /api/cash-register/open | ✅ | ✅ |
| POST /api/cash-register/close | ✅ | ✅ |
| GET /api/cash-register/history | ✅ | ❌ |
| GET /api/dashboard/* | ✅ | ❌ |

---

## 📊 Exemples de Réponses d'Erreur

### Erreur de validation (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": [
      {
        "field": "price_ht",
        "message": "Le prix HT doit être supérieur à 0"
      }
    ]
  }
}
```

### Erreur d'authentification (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token invalide ou expiré"
  }
}
```

### Erreur métier (422)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PAYMENT",
    "message": "Le montant payé est insuffisant",
    "details": {
      "total_due": 18.17,
      "amount_paid": 15.00,
      "missing": 3.17
    }
  }
}
```

---

## 🚀 Rate Limiting

- **Authentification** : 5 tentatives / 15 minutes
- **API générale** : 100 requêtes / minute
- **Création ventes** : 50 ventes / minute

**Header de réponse** :
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642154400
```

---

## 📦 Format des Données

### Dates
Format ISO 8601 : `2025-01-10T14:23:45.000Z`

### Montants
Décimal avec 2 décimales : `18.17`

### TVA
Pourcentage avec 1 décimale : `10.0` (pour 10%)

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-01-10
