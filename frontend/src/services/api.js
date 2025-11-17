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
  withCredentials: true,
});

// Intercepteur pour ajouter le token JWT (RÉTROCOMPATIBILITÉ)
// Le backend supporte encore Authorization header pendant la transition
// Mais priorité au cookie httpOnly (plus sécurisé)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide (cookie httpOnly expiré côté backend)
      // Le cookie sera automatiquement supprimé par le backend
      // On nettoie juste localStorage pour les données utilisateur
      localStorage.removeItem('token'); // Rétrocompatibilité
      localStorage.removeItem('user');

      // Rediriger vers login seulement si on n'y est pas déjà
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
