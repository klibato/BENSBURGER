# FRONTEND OVERVIEW - Documentation Technique

> **PHASE 0.A.2** - Vue d'ensemble architecture frontend React
> **Date**: 2025-11-15
> **Fichiers frontend** : 45 fichiers (.jsx + .js)
> **Objectif** : Documenter l'architecture frontend et détecter les problèmes critiques

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Stack technologique](#stack-technologique)
3. [Architecture de l'application](#architecture-de-lapplication)
4. [Context API (State Management)](#context-api-state-management)
5. [Routes et pages](#routes-et-pages)
6. [Services API](#services-api)
7. [Problèmes critiques détectés](#problèmes-critiques-détectés)
8. [Recommandations](#recommandations)

---

## Vue d'ensemble

Application **React 18** utilisant **Vite** comme bundler. Architecture basée sur :
- **Context API** pour le state management (7 contexts)
- **React Router v6** pour la navigation (8 routes)
- **Axios** pour les appels API
- **TailwindCSS** pour le styling (CSS utility-first)
- **i18n** pour l'internationalisation (FR/EN)

### Structure des fichiers (45 fichiers)

| Catégorie | Nombre | Exemples |
|-----------|--------|----------|
| **Context** | 7 | Auth, Cart, CashRegister, Language, Permissions, StoreConfig, Theme |
| **Pages** | 8 | Dashboard, Login, POS, Products, Users, Settings, Logs, SalesHistory |
| **Components** | 14 | UI (Button, Modal), Products (Grid, Card, Form), Payment, CashRegister, Auth |
| **Services** | 9 | api, auth, sales, products, users, cashRegister, dashboard, logs, settings |
| **Utils/Hooks/i18n** | 7 | saleHelper, permissions, constants, useProducts, translations |

**Total** : 45 fichiers frontend (.jsx + .js)

---

## Stack technologique

### Dépendances (package.json)

**Runtime** :
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "axios": "^1.7.9",
  "recharts": "^2.15.0" // Graphiques dashboard
}
```

**Dev Dependencies** :
```json
{
  "vite": "^6.0.1",
  "tailwindcss": "^3.4.17",
  "@vitejs/plugin-react": "^4.3.4",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49"
}
```

### Build et Dev

**Scripts** :
```bash
npm run dev      # Vite dev server (port 5173)
npm run build    # Build production
npm run preview  # Preview build
```

**Environment Variables** :
```bash
VITE_API_URL=http://localhost:3000/api  # Backend API URL
```

---

## Architecture de l'application

### App.jsx - Point d'entrée

**Localisation** : `/frontend/src/App.jsx` (50 lignes)

**Structure** :
```jsx
function App() {
  return (
    <ThemeProvider>                {/* 7. Thème (dark/light) */}
      <LanguageProvider>            {/* 6. Langue (FR/EN) */}
        <StoreConfigProvider>       {/* 5. Config commerce (BDD) */}
          <AuthProvider>            {/* 4. Authentification */}
            <PermissionsProvider>   {/* 3. Permissions RBAC */}
              <CashRegisterProvider> {/* 2. Caisse active */}
                <CartProvider>      {/* 1. Panier POS */}
                  <Router>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/" element={<POSPage />} />
                      <Route path="/sales" element={<SalesHistoryPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/users" element={<UsersPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/logs" element={<LogsPage />} />
                    </Routes>
                  </Router>
                </CartProvider>
              </CashRegisterProvider>
            </PermissionsProvider>
          </AuthProvider>
        </StoreConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
```

**Ordre des Providers** : Du plus global (Theme) au plus spécifique (Cart).

### ⚠️ PROBLÈME CRITIQUE : Pas de protection de routes !

❌ **Toutes les routes sont accessibles sans authentification**. Aucun composant `PrivateRoute` ou vérification d'authentification.

```jsx
// ❌ Route non protégée
<Route path="/dashboard" element={<DashboardPage />} />

// ✅ Devrait être
<Route path="/dashboard" element={
  <PrivateRoute requiredRole="admin">
    <DashboardPage />
  </PrivateRoute>
} />
```

---

## Context API (State Management)

### 1. AuthContext (`context/AuthContext.jsx` - 83 lignes)

**Rôle** : Gestion de l'authentification utilisateur.

**State** :
```javascript
{
  user: { id, username, role, first_name, last_name } | null,
  loading: boolean,
  isAuthenticated: boolean,
  isAdmin: boolean
}
```

**Méthodes** :

#### `login(username, pin_code)`
```javascript
const login = async (username, pin_code) => {
  const response = await api.post('/auth/login', { username, pin_code });
  const { token, user: userData } = response.data.data;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
  setUser(userData);

  return { success: true };
};
```

**Stockage** :
- `localStorage.token` : JWT token
- `localStorage.user` : Objet user sérialisé

#### `logout()`
```javascript
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setUser(null);
};
```

#### `switchCashier(username, pin_code)`
Permet de changer de caissier sans déconnecter complètement (utile pour multi-caissiers sur le même terminal).

**⚠️ Problèmes** :
- ❌ Pas de **validation de l'expiration du token** côté client
- ❌ User stocké en **plaintext** dans localStorage (pas de chiffrement)
- ❌ Pas de **refresh token** (déconnexion brutale après expiration)

### 2. CartContext (`context/CartContext.jsx` - 203 lignes)

**Rôle** : Gestion du panier POS (Point Of Sale).

**State** :
```javascript
{
  cart: [
    { id, name, price_ttc, quantity, vat_rate, ... },
    ...
  ],
  discount: { type: 'percentage' | 'amount', value: number } | null
}
```

**Méthodes principales** :

#### `addToCart(product, quantity = 1)`
Ajoute un produit au panier (incrémente si déjà présent).

```javascript
const addToCart = (product, quantity = 1) => {
  setCart((prev) => {
    const existingItem = prev.find((item) => item.id === product.id);

    if (existingItem) {
      return prev.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    }

    return [...prev, { ...product, quantity }];
  });
};
```

#### `getTotal()`
Calcule le total avec remise.

```javascript
const getTotal = () => {
  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.price_ttc) * item.quantity,
    0
  );

  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100);
    } else if (discount.type === 'amount') {
      discountAmount = Math.min(discount.value, subtotal);
    }
  }

  return {
    subtotal,
    discountAmount,
    total: Math.max(0, subtotal - discountAmount),
    hasDiscount: !!discount,
  };
};
```

**Persistance** : Le panier est sauvegardé dans `localStorage.pos_cart` (JSON) à chaque modification.

**✅ Points forts** :
- Panier persisté (survit aux rechargements de page)
- Support des remises (pourcentage ou montant fixe)
- API simple et complète

**⚠️ Problèmes** :
- ❌ Pas de vérification de **stock disponible** avant ajout
- ❌ Pas de **validation des prix** (pourrait être modifié côté client)
- ❌ Pas de **nettoyage automatique** du panier après X jours

### 3. CashRegisterContext

**Rôle** : Gestion de la caisse active.

**State** : `activeCashRegister` (objet CashRegister ou null)

**Méthodes** (supposées, non lues en détail) :
- `openRegister(data)` : Ouvrir une caisse
- `closeRegister(data)` : Fermer la caisse
- `refreshRegister()` : Recharger la caisse active

### 4. PermissionsContext

**Rôle** : Gestion des permissions RBAC (Role-Based Access Control).

**Utilisation** (supposée) :
```javascript
const { hasPermission } = usePermissions();

if (hasPermission('manage_products')) {
  // Afficher le bouton "Créer produit"
}
```

### 5. StoreConfigContext

**Rôle** : Configuration du commerce (depuis BDD).

**State** (supposé) :
```javascript
{
  store_name: "FlexPOS",
  categories: [...],
  vat_rates: [...],
  payment_methods: { cash: true, card: true, ... },
  theme_color: "#FF6B35",
  currency: "EUR",
  language: "fr-FR"
}
```

### 6. LanguageContext

**Rôle** : i18n (internationalisation).

**Langues supportées** : Français (FR), Anglais (EN)

**Utilisation** (supposée) :
```javascript
const { t } = useLanguage();
<button>{t('common.save')}</button>
```

### 7. ThemeContext

**Rôle** : Thème dark/light.

**Utilisation** (supposée) :
```javascript
const { theme, toggleTheme } = useTheme();
<button onClick={toggleTheme}>{theme === 'dark' ? '🌙' : '☀️'}</button>
```

---

## Routes et pages

### Routes définies (App.jsx)

| Path | Page | Rôle | Protection |
|------|------|------|------------|
| `/login` | LoginPage | Connexion avec PIN | ❌ Public |
| `/` | POSPage | Caisse enregistreuse (POS) | ❌ NON PROTÉGÉE ! |
| `/sales` | SalesHistoryPage | Historique ventes | ❌ NON PROTÉGÉE ! |
| `/dashboard` | DashboardPage | Tableau de bord stats | ❌ NON PROTÉGÉE ! |
| `/products` | ProductsPage | Gestion produits | ❌ NON PROTÉGÉE ! |
| `/users` | UsersPage | Gestion utilisateurs | ❌ NON PROTÉGÉE ! |
| `/settings` | SettingsPage | Paramètres commerce | ❌ NON PROTÉGÉE ! |
| `/logs` | LogsPage | Logs d'audit | ❌ NON PROTÉGÉE ! |

### ❌ PROBLÈME MAJEUR : Aucune route n'est protégée !

**Impact** :
- N'importe qui peut accéder au POS sans connexion
- Accès direct à `/users` sans authentification
- Pas de vérification de permissions (admin vs cashier)

**Solution recommandée** :

Créer un composant `PrivateRoute.jsx` :
```javascript
const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />; // Accès refusé
  }

  return children;
};

// Utilisation
<Route path="/users" element={
  <PrivateRoute requiredRole="admin">
    <UsersPage />
  </PrivateRoute>
} />
```

---

## Services API

### api.js - Client Axios configuré

**Localisation** : `/frontend/src/services/api.js` (45 lignes)

**Configuration** :
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10 secondes
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Intercepteur Request** : Ajoute le Bearer token
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Intercepteur Response** : Gère le 401 (Unauthorized)
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Services métier (9 fichiers)

| Service | Endpoints | Rôle |
|---------|-----------|------|
| `authService.js` | `/auth/login`, `/auth/switch-cashier` | Authentification |
| `saleService.js` | `/sales`, `/sales/:id` | Ventes |
| `productService.js` | `/products` | Produits |
| `userService.js` | `/users` | Utilisateurs |
| `cashRegisterService.js` | `/cash-registers` | Caisses |
| `dashboardService.js` | `/dashboard/stats` | Statistiques |
| `settingsService.js` | `/settings` | Paramètres commerce |
| `logsService.js` | `/logs` | Logs d'audit |
| `sumupService.js` | `/sumup/*` | Paiements SumUp |

**Pattern** :
```javascript
// Exemple productService.js
import api from './api';

export const getAllProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post('/products', productData);
  return response.data;
};
```

---

## Problèmes critiques détectés

### 🔴 Sécurité

| # | Problème | Impact | Localisation |
|---|----------|--------|--------------|
| 1 | **Aucune route protégée** | ❌ Accès POS sans auth | App.jsx |
| 2 | **User en plaintext dans localStorage** | ⚠️ Vol de session facile | AuthContext.jsx:35 |
| 3 | **Pas de validation expiration token** | ⚠️ Token expiré utilisé | AuthContext.jsx |
| 4 | **Pas de CSRF protection** | ⚠️ Attaques CSRF possibles | api.js |
| 5 | **Pas de validation des prix côté client** | ⚠️ Modification panier | CartContext.jsx |

### ⚠️ Architecture

| # | Problème | Recommandation |
|---|----------|----------------|
| 1 | 7 Providers imbriqués | Utiliser Redux ou Zustand |
| 2 | Pas de code splitting | Ajouter React.lazy() + Suspense |
| 3 | Pas de error boundary | Ajouter <ErrorBoundary> global |
| 4 | Timeout 10s trop long | Réduire à 5s pour API |

### 🟡 Performance

| # | Problème | Recommandation |
|---|----------|----------------|
| 1 | Panier sauvegardé à chaque modification | Debounce la sauvegarde (500ms) |
| 2 | Pas de cache React Query | Ajouter React Query ou SWR |
| 3 | Re-render de tous les contexts | Utiliser React.memo + useMemo |

---

## Recommandations

### 1. Sécurité - Protéger les routes (URGENT)

**Fichier à créer** : `/frontend/src/components/auth/PrivateRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role) && user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
```

**Mise à jour App.jsx** :
```jsx
import PrivateRoute from './components/auth/PrivateRoute';

<Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route path="/" element={
    <PrivateRoute>
      <POSPage />
    </PrivateRoute>
  } />

  <Route path="/users" element={
    <PrivateRoute requiredRole="admin">
      <UsersPage />
    </PrivateRoute>
  } />

  <Route path="/dashboard" element={
    <PrivateRoute requiredRole={['admin', 'manager']}>
      <DashboardPage />
    </PrivateRoute>
  } />
</Routes>
```

### 2. Sécurité - Chiffrer le user dans localStorage

```javascript
// utils/secureStorage.js
import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET || 'default-secret';

export const setSecureItem = (key, value) => {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), SECRET_KEY).toString();
  localStorage.setItem(key, encrypted);
};

export const getSecureItem = (key) => {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;

  const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
};
```

### 3. Performance - Code splitting

```jsx
import { lazy, Suspense } from 'react';

const POSPage = lazy(() => import('./pages/POSPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));

function App() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <Routes>
        <Route path="/" element={<POSPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 4. Multi-Tenant - Ajouter organization_id

**Problème** : Actuellement mono-tenant.

**Solution** : Ajouter `organization_id` dans AuthContext

```javascript
// AuthContext.jsx
const login = async (username, pin_code, organizationId) => {
  const response = await api.post('/auth/login', {
    username,
    pin_code,
    organization_id: organizationId // ← Ajouter
  });
  // ...
};

// Intercepteur API
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (user.organization_id) {
    config.headers['X-Organization-ID'] = user.organization_id; // ← Ajouter
  }

  return config;
});
```

---

## Résumé statistique

| Métrique | Valeur |
|----------|--------|
| **Fichiers frontend** | 45 |
| **Context Providers** | 7 |
| **Routes** | 8 |
| **Pages** | 8 |
| **Components** | 14 |
| **Services API** | 9 |
| **Bugs critiques** | 5 (sécurité) |
| **Warnings** | 6 (architecture + performance) |
| **Routes protégées** | 0/8 ❌ |
| **Multi-tenant ready** | ❌ Non |

---

**Fin de la documentation FRONTEND_OVERVIEW.md**
