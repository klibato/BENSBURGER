import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sécurité: Vérifier la session via le cookie httpOnly (pas de token en localStorage)
    // On appelle /auth/me pour valider que le cookie est encore valide
    const checkSession = async () => {
      try {
        // Si on a un user en cache, on vérifie que la session est toujours valide
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          // Vérifier la validité du cookie via l'API
          const response = await api.get('/auth/me');
          setUser(response.data.data);
          // Mettre à jour le cache avec les données fraîches
          localStorage.setItem('user', JSON.stringify(response.data.data));
        }
      } catch {
        // Cookie invalide ou expiré, nettoyer le cache
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (username, pin_code) => {
    try {
      const response = await api.post('/auth/login', { username, pin_code });
      // Sécurité: Le token est dans le cookie httpOnly (pas dans la réponse JSON)
      const { user: userData } = response.data.data;

      // On garde seulement les données utilisateur en localStorage (pour le cache UI)
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Erreur de connexion',
      };
    }
  };

  const logout = async () => {
    try {
      // Appeler le backend pour supprimer le cookie httpOnly
      await api.post('/auth/logout');
    } catch {
      // Ignorer les erreurs de logout (cookie peut-être déjà expiré)
    } finally {
      // Nettoyer le cache local
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const switchCashier = async (username, pin_code) => {
    try {
      const response = await api.post('/auth/switch-cashier', { username, pin_code });
      // Sécurité: Le nouveau token est dans le cookie httpOnly
      const { user: userData } = response.data.data;

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Erreur lors du changement de caissier',
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    switchCashier,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
