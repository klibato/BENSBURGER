import { createContext, useContext, useState, useEffect } from 'react';
import { getActiveCashRegister } from '../services/cashRegisterService';
import { useAuth } from './AuthContext';

const CashRegisterContext = createContext();

export const useCashRegister = () => {
  const context = useContext(CashRegisterContext);
  if (!context) {
    throw new Error('useCashRegister must be used within CashRegisterProvider');
  }
  return context;
};

export const CashRegisterProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeCashRegister, setActiveCashRegister] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger la caisse active au montage ou quand l'utilisateur change
  const fetchActiveCashRegister = async () => {
    // Vérifier qu'un utilisateur est authentifié
    if (!isAuthenticated || !user) {
      setActiveCashRegister(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getActiveCashRegister();
      setActiveCashRegister(response.data);
    } catch (err) {
      // Pas de caisse active n'est pas une erreur critique
      if (err.response?.status === 404) {
        setActiveCashRegister(null);
      } else if (err.response?.status === 401) {
        // Non authentifié - ne pas afficher d'erreur
        setActiveCashRegister(null);
      } else {
        setError(err.response?.data?.error?.message || 'Erreur lors du chargement de la caisse');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch quand l'utilisateur change (login, logout, switch organization)
  // Utilise user?.id et user?.organization_id pour détecter les changements
  useEffect(() => {
    fetchActiveCashRegister();
  }, [user?.id, user?.organization_id, isAuthenticated]);

  // Ouvrir une caisse (met à jour le state local)
  const openRegister = (cashRegister) => {
    setActiveCashRegister(cashRegister);
  };

  // Fermer la caisse active
  const closeRegister = () => {
    setActiveCashRegister(null);
  };

  // Vérifier si une caisse est ouverte
  const hasActiveCashRegister = () => {
    return activeCashRegister !== null;
  };

  // Rafraîchir les données de la caisse active
  const refreshCashRegister = async () => {
    await fetchActiveCashRegister();
  };

  const value = {
    activeCashRegister,
    loading,
    error,
    openRegister,
    closeRegister,
    hasActiveCashRegister,
    refreshCashRegister,
  };

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  );
};
