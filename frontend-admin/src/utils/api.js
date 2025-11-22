import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.flexpos.app/api/admin';

const api = axios.create({
  baseURL: API_BASE_URL,
  // Sécurité NF525: Envoyer les cookies httpOnly avec chaque requête
  // Le token JWT est stocké dans un cookie httpOnly (pas en localStorage)
  // Cela protège contre les attaques XSS car JavaScript ne peut pas accéder au cookie
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sécurité: PAS d'intercepteur pour ajouter Authorization header
// On utilise uniquement les cookies httpOnly (plus sécurisé)
// Le backend lit le token depuis req.cookies.admin_token

// Intercepteur pour gérer les erreurs d'auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie httpOnly expiré ou invalide
      // Nettoyer le cache admin local
      localStorage.removeItem('admin_user');

      // Ne rediriger que si on n'est pas déjà sur /login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH
// ============================================

export const login = async (identifier, password) => {
  const response = await api.post('/auth/login', { identifier, password });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// ============================================
// ANALYTICS
// ============================================

export const getDashboard = async () => {
  const response = await api.get('/analytics/dashboard');
  return response.data;
};

// ============================================
// ORGANIZATIONS
// ============================================

export const getOrganizations = async (params = {}) => {
  const response = await api.get('/organizations', { params });
  return response.data;
};

export const getOrganizationById = async (id) => {
  const response = await api.get(`/organizations/${id}`);
  return response.data;
};

export const suspendOrganization = async (id, reason) => {
  const response = await api.put(`/organizations/${id}/suspend`, { reason });
  return response.data;
};

export const activateOrganization = async (id) => {
  const response = await api.put(`/organizations/${id}/activate`);
  return response.data;
};

export const getOrganizationSales = async (id, params = {}) => {
  const response = await api.get(`/organizations/${id}/sales`, { params });
  return response.data;
};

export const getOrganizationUsers = async (id) => {
  const response = await api.get(`/organizations/${id}/users`);
  return response.data;
};

export const getOrganizationInvoices = async (id, params = {}) => {
  const response = await api.get(`/organizations/${id}/invoices`, { params });
  return response.data;
};

export const updateOrganizationSubscription = async (id, data) => {
  const response = await api.put(`/organizations/${id}/subscription`, data);
  return response.data;
};

// ============================================
// USERS
// ============================================

export const changeUserPassword = async (userId, newPinCode) => {
  const response = await api.put(`/users/${userId}/password`, { new_pin_code: newPinCode });
  return response.data;
};

// ============================================
// INVOICES
// ============================================

export const getInvoices = async (params = {}) => {
  const response = await api.get('/invoices', { params });
  return response.data;
};

export default api;
