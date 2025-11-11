import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isAuthenticated || !user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/permissions');
        setPermissions(response.data.data.permissions || []);
      } catch (error) {
        console.error('Erreur lors du chargement des permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, isAuthenticated]);

  /**
   * Vérifie si l'utilisateur a une permission
   * @param {string} permission - La permission à vérifier
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  /**
   * Vérifie si l'utilisateur a toutes les permissions
   * @param {Array<string>} perms - Les permissions à vérifier
   * @returns {boolean}
   */
  const hasAllPermissions = (perms) => {
    return perms.every((perm) => permissions.includes(perm));
  };

  /**
   * Vérifie si l'utilisateur a au moins une des permissions
   * @param {Array<string>} perms - Les permissions à vérifier
   * @returns {boolean}
   */
  const hasAnyPermission = (perms) => {
    return perms.some((perm) => permissions.includes(perm));
  };

  /**
   * Vérifie si l'utilisateur est admin
   * @returns {boolean}
   */
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  /**
   * Vérifie si l'utilisateur est caissier
   * @returns {boolean}
   */
  const isCashier = () => {
    return user?.role === 'cashier';
  };

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    isCashier,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};
