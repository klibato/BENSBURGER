# Changements Frontend pour JWT Refresh Tokens (P1-6)

## 🎯 Objectif
Adapter le frontend pour gérer automatiquement le renouvellement des access tokens via refresh tokens

---

## 📋 Vue d'ensemble des changements

### Ancien système (avant P1-6)
- Access token valide 8 heures
- Stocké dans cookie httpOnly `token`
- Pas de renouvellement automatique
- Après 8h → déconnexion forcée

### Nouveau système (après P1-6)
- Access token valide **15 minutes**
- Refresh token valide **7 jours**
- Renouvellement automatique transparent pour l'utilisateur
- Après 7 jours inactifs → déconnexion

---

## 🔧 Changements requis

### 1. Intercepteur Axios/Fetch - AUTO REFRESH ⭐

**Fichier:** `frontend/src/utils/api.js` (ou équivalent)

#### Avant (ancien code)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important pour envoyer cookies httpOnly
});

export default api;
```

#### Après (nouveau code avec auto-refresh)
```javascript
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Si React Router

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important pour cookies httpOnly
});

// ✅ P1-6: Intercepteur pour refresh automatique
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => response, // Succès, on laisse passer
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 et pas déjà une retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Vérifier si c'est l'endpoint refresh lui-même qui échoue
      if (originalRequest.url === '/auth/refresh') {
        // Le refresh token est invalide/expiré → logout complet
        console.log('Refresh token invalide, déconnexion...');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Si déjà en train de refresh, mettre en queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest); // Retry la requête
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Appeler endpoint refresh
        await api.post('/auth/refresh');

        // Refresh réussi, processer la queue
        processQueue(null);
        isRefreshing = false;

        // Retry la requête originale
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh échoué → déconnexion
        processQueue(refreshError);
        isRefreshing = false;

        console.log('Impossible de refresh le token, déconnexion...');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Impact:** ⭐ **CRITIQUE**
- Toutes les requêtes utilisent automatiquement cet intercepteur
- Transparent pour l'utilisateur (pas de déconnexion brutale)
- Gère la queue de requêtes pendant le refresh

---

### 2. Composant KeepAlive (optionnel mais recommandé)

**Fichier:** `frontend/src/components/KeepAlive.jsx` (nouveau)

```javascript
import { useEffect } from 'react';
import api from '../utils/api';

/**
 * ✅ P1-6: Composant pour garder la session active
 *
 * Refresh automatiquement le token toutes les 10 minutes
 * pour éviter expiration pendant utilisation active
 */
const KeepAlive = () => {
  useEffect(() => {
    // Refresh toutes les 10 minutes (avant expiration 15min)
    const interval = setInterval(async () => {
      try {
        await api.post('/auth/refresh');
        console.log('[KeepAlive] Token refreshed successfully');
      } catch (error) {
        console.error('[KeepAlive] Failed to refresh token:', error);
        // L'intercepteur gérera la déconnexion si nécessaire
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  return null; // Composant invisible
};

export default KeepAlive;
```

**Utilisation dans App.jsx:**
```javascript
import KeepAlive from './components/KeepAlive';

function App() {
  return (
    <Router>
      <KeepAlive /> {/* ✅ P1-6: Garder session active */}

      <Routes>
        {/* ... routes ... */}
      </Routes>
    </Router>
  );
}
```

**Impact:** 🟡 RECOMMANDÉ
- Évite déconnexion pendant utilisation active
- Refresh préventif avant expiration
- Améliore UX (pas d'interruption)

---

### 3. Page Login - Pas de changements requis ✅

**Fichier:** `frontend/src/pages/Login.jsx`

```javascript
// ✅ Aucun changement nécessaire!
// Le backend retourne déjà les tokens dans les cookies httpOnly

const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const response = await api.post('/auth/login', {
      username,
      pin_code: pinCode,
    });

    // Cookies token + refreshToken déjà définis par le backend
    // Rediriger vers dashboard
    navigate('/dashboard');
  } catch (error) {
    setError(error.response?.data?.error?.message || 'Erreur de connexion');
  }
};
```

**Impact:** ✅ AUCUN CHANGEMENT
- Backend gère automatiquement les cookies
- Frontend n'a rien à faire de spécial

---

### 4. Page Logout - Pas de changements requis ✅

**Fichier:** `frontend/src/pages/Dashboard.jsx` (bouton logout)

```javascript
// ✅ Aucun changement nécessaire!
// Le backend révoque automatiquement le refresh token

const handleLogout = async () => {
  try {
    await api.post('/auth/logout');

    // Cookies token + refreshToken déjà supprimés par le backend
    navigate('/login');
  } catch (error) {
    console.error('Erreur logout:', error);
    // Même en cas d'erreur, rediriger vers login
    navigate('/login');
  }
};
```

**Impact:** ✅ AUCUN CHANGEMENT
- Backend gère révocation automatique

---

### 5. Switch Cashier - Pas de changements requis ✅

**Fichier:** `frontend/src/components/SwitchCashier.jsx`

```javascript
// ✅ Aucun changement nécessaire!
// Le backend gère automatiquement rotation des tokens

const handleSwitchCashier = async (e) => {
  e.preventDefault();

  try {
    const response = await api.post('/auth/switch-cashier', {
      username,
      pin_code: pinCode,
    });

    // Nouveaux cookies token + refreshToken déjà définis
    setCurrentUser(response.data.data.user);
  } catch (error) {
    setError(error.response?.data?.error?.message);
  }
};
```

**Impact:** ✅ AUCUN CHANGEMENT
- Backend gère rotation automatique

---

### 6. Gestion d'erreurs 401 - Améliorations UX

**Fichier:** `frontend/src/hooks/useAuth.js` (ou équivalent)

#### Avant
```javascript
const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUser(res.data.data))
      .catch(err => {
        console.error('Erreur auth:', err);
        // Redirection brutale
        window.location.href = '/login';
      });
  }, []);

  return { user };
};
```

#### Après (avec gestion refresh)
```javascript
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
      } catch (err) {
        console.error('Erreur auth:', err);

        // ✅ P1-6: L'intercepteur a déjà tenté le refresh
        // Si on arrive ici, c'est que le refresh a échoué
        // Donc on peut rediriger vers login en toute sécurité

        setUser(null);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
};
```

**Impact:** 🟢 AMÉLIORATION
- Meilleure gestion du loading
- Confiance dans l'intercepteur

---

### 7. Notification utilisateur (optionnel)

**Fichier:** `frontend/src/components/SessionExpirationWarning.jsx` (nouveau)

```javascript
import { useState, useEffect } from 'react';
import { Alert } from './ui/Alert'; // Votre composant d'alerte

/**
 * ✅ P1-6: Avertir l'utilisateur si proche de l'expiration du refresh token
 *
 * Si le refresh token expire dans < 24h, afficher un avertissement
 */
const SessionExpirationWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [daysLeft, setDaysLeft] = useState(7);

  useEffect(() => {
    // Vérifier toutes les heures
    const interval = setInterval(async () => {
      try {
        // Appeler un endpoint qui retourne l'expiration du refresh token
        // (à créer côté backend si besoin)
        const res = await api.get('/auth/token-info');

        const expiresAt = new Date(res.data.refresh_token_expires_at);
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        setDaysLeft(daysRemaining);

        if (daysRemaining <= 1) {
          setShowWarning(true);
        }
      } catch (error) {
        console.error('Erreur vérification expiration:', error);
      }
    }, 60 * 60 * 1000); // Toutes les heures

    return () => clearInterval(interval);
  }, []);

  if (!showWarning) return null;

  return (
    <Alert variant="warning">
      ⚠️ Votre session expirera dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}.
      Veuillez vous reconnecter pour éviter toute interruption.
    </Alert>
  );
};

export default SessionExpirationWarning;
```

**Impact:** 🟡 OPTIONNEL
- Améliore UX pour sessions longues
- Nécessite endpoint backend `/auth/token-info` (à créer)

---

## 📊 Résumé des changements

| Fichier | Changement | Priorité | Complexité |
|---------|-----------|----------|------------|
| `utils/api.js` | Intercepteur auto-refresh | ⭐ CRITIQUE | 🟢 Facile |
| `components/KeepAlive.jsx` | Keep-alive préventif | 🟡 RECOMMANDÉ | 🟢 Facile |
| `pages/Login.jsx` | Aucun changement | ✅ RIEN | - |
| `pages/Logout.jsx` | Aucun changement | ✅ RIEN | - |
| `components/SwitchCashier.jsx` | Aucun changement | ✅ RIEN | - |
| `hooks/useAuth.js` | Amélioration gestion erreurs | 🟢 UTILE | 🟢 Facile |
| `components/SessionWarning.jsx` | Notification expiration | 🔵 OPTIONNEL | 🟡 Moyen |

---

## 🧪 Tests Frontend

### Test 1: Auto-refresh transparent
1. Se connecter
2. Utiliser l'application normalement
3. Attendre 16 minutes (après expiration access token)
4. Faire une action (ex: créer produit)
5. ✅ L'action réussit sans déconnexion (refresh automatique)

### Test 2: Keep-alive actif
1. Se connecter
2. Laisser l'application ouverte 1 heure
3. Vérifier dans DevTools Network: requêtes `/auth/refresh` toutes les 10 min
4. ✅ Pas de déconnexion

### Test 3: Refresh échoue → logout
1. Se connecter
2. Manuellement supprimer le cookie `refreshToken` dans DevTools
3. Faire une action
4. ✅ Redirection automatique vers `/login`

### Test 4: Multi-onglets
1. Ouvrir 2 onglets de l'application
2. Se connecter dans onglet 1
3. Dans onglet 2, faire une action
4. ✅ L'action réussit (cookies partagés entre onglets)

---

## 🚨 Pièges à éviter

### ❌ Piège 1: Boucle infinie de refresh
**Cause:** Intercepteur refresh appelle lui-même refresh en cas d'erreur
**Solution:** Vérifier `originalRequest.url !== '/auth/refresh'` avant retry

### ❌ Piège 2: Requêtes en parallèle déclenchent plusieurs refresh
**Cause:** Plusieurs requêtes 401 simultanées déclenchent plusieurs `/auth/refresh`
**Solution:** Utiliser `isRefreshing` flag + queue (voir code ci-dessus)

### ❌ Piège 3: Cookie refreshToken non envoyé
**Cause:** Path `/api/auth/refresh` pas respecté
**Solution:** Assurer que `baseURL` + path = exactement `/api/auth/refresh`

### ❌ Piège 4: CORS bloque cookies
**Cause:** `withCredentials: true` manquant dans Axios
**Solution:** Toujours définir `withCredentials: true` dans config Axios

---

## 📝 Checklist validation frontend

- [ ] Intercepteur Axios/Fetch avec auto-refresh implémenté
- [ ] Flag `withCredentials: true` activé
- [ ] Gestion queue de requêtes pendant refresh
- [ ] Composant KeepAlive ajouté (optionnel)
- [ ] Tests manuels passés (voir section Tests Frontend)
- [ ] Pas de boucle infinie refresh détectée
- [ ] Multi-onglets fonctionne correctement
- [ ] Logs console clairs (debug/info)
- [ ] UX fluide (pas d'interruptions)
- [ ] Redirection login uniquement si refresh échoue

---

## 🎯 Résultat attendu

Si tous les changements sont appliqués:
- ✅ **Session maintenue automatiquement pendant 7 jours**
- ✅ **Sécurité renforcée (tokens 15min vs 8h)**
- ✅ **UX transparente (aucune interruption)**
- ✅ **Multi-onglets supporté**
- ✅ **Déconnexion propre après 7j inactivité**
- ✅ **Prêt pour production**

---

## 💡 Optimisations futures (hors scope P1-6)

1. **Token rotation:** Générer nouveau refresh token à chaque refresh access token
2. **Remember me:** Refresh token 30 jours si case "Se souvenir" cochée
3. **Analytics:** Logger événements refresh pour monitoring
4. **Offline support:** Queue requêtes si réseau indisponible
5. **Fingerprinting:** Lier refresh token à device fingerprint (sécurité++)

---

## 📞 Support

En cas de problème avec l'implémentation frontend:
1. Vérifier DevTools Network pour voir requêtes `/auth/refresh`
2. Vérifier cookies dans DevTools Application > Cookies
3. Vérifier logs console pour erreurs intercepteur
4. Tester manuellement `/auth/refresh` via Postman/curl

**Référence backend:** Voir `TESTS_P1-6_REFRESH_TOKENS.md`
