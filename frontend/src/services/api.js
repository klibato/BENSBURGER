import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Instance Axios configurée
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Sécurité NF525: Envoyer les cookies httpOnly avec chaque requête
  // Le token JWT est stocké dans un cookie httpOnly (pas en localStorage)
  // Cela protège contre les attaques XSS car JavaScript ne peut pas accéder au cookie
  withCredentials: true,
});

// Sécurité: PAS d'intercepteur pour ajouter Authorization header
// On utilise uniquement les cookies httpOnly (plus sécurisé)
// Le backend lit le token depuis req.cookies.token

// Intercepteur pour gérer les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie httpOnly expiré ou invalide
      // Nettoyer le cache utilisateur local
      localStorage.removeItem('user');

      // Rediriger vers login seulement si on n'y est pas déjà
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 403) {
      // Organisation suspendue ou annulée
      const errorMessage = error.response?.data?.error?.message || 'Accès refusé';

      // Nettoyer le cache utilisateur local
      localStorage.removeItem('user');

      // Afficher le message d'erreur et rediriger vers login
      alert(errorMessage);
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
