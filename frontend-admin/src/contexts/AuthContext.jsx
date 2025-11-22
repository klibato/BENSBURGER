import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sécurité: Vérifier la session via le cookie httpOnly
    // On appelle /auth/me pour valider que le cookie est encore valide
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Vérifier si on a un admin en cache
      const storedAdmin = localStorage.getItem('admin_user');
      if (storedAdmin) {
        // Vérifier la validité du cookie via l'API
        const response = await getMe();
        if (response.success) {
          setAdmin(response.data.admin);
          // Mettre à jour le cache avec les données fraîches
          localStorage.setItem('admin_user', JSON.stringify(response.data.admin));
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Cookie invalide ou expiré, nettoyer le cache
      setAdmin(null);
      localStorage.removeItem('admin_user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      const response = await apiLogin(identifier, password);
      if (response.success) {
        setAdmin(response.data.admin);
        // On garde seulement les données admin en localStorage (pour le cache UI)
        // Le token est dans le cookie httpOnly (pas dans la réponse)
        localStorage.setItem('admin_user', JSON.stringify(response.data.admin));
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Erreur de connexion' },
      };
    }
  };

  const logout = async () => {
    try {
      // Appeler le backend pour supprimer le cookie httpOnly
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Nettoyer le cache local
      setAdmin(null);
      localStorage.removeItem('admin_user');
    }
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
