import { createContext, useContext, useState, useEffect } from 'react';
import { getPublicConfig } from '../services/settingsService';

const StoreConfigContext = createContext();

// Helper pour ajuster la luminosité d'une couleur hexadécimale
const adjustBrightness = (hex, percent) => {
  // Convertir hex en RGB
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export const useStoreConfig = () => {
  const context = useContext(StoreConfigContext);
  if (!context) {
    throw new Error('useStoreConfig must be used within StoreConfigProvider');
  }
  return context;
};

export const StoreConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    categories: [],
    vat_rates: [],
    payment_methods: {},
    theme_color: '#FF6B35',
    currency: 'EUR',
    currency_symbol: '€',
    logo_url: null,
    store_name: 'BensBurger',
    language: 'fr-FR',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPublicConfig();
      setConfig(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement de la configuration:', err);
      setError(err.message);
      // Utiliser la config par défaut en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Appliquer le theme_color dynamiquement au DOM
  useEffect(() => {
    if (config.theme_color) {
      document.documentElement.style.setProperty('--color-primary', config.theme_color);
      // Générer des variations de la couleur pour hover, etc.
      document.documentElement.style.setProperty('--color-primary-hover', adjustBrightness(config.theme_color, -10));
      document.documentElement.style.setProperty('--color-primary-light', adjustBrightness(config.theme_color, 30));
    }
  }, [config.theme_color]);

  // Fonction helper pour obtenir une catégorie par ID
  const getCategoryById = (categoryId) => {
    return config.categories.find((cat) => cat.id === categoryId);
  };

  // Fonction helper pour obtenir un taux de TVA
  const getVatRate = (rate) => {
    return config.vat_rates.find((vat) => vat.rate === rate);
  };

  // Fonction helper pour vérifier si un moyen de paiement est activé
  const isPaymentMethodEnabled = (method) => {
    return config.payment_methods[method]?.enabled ?? false;
  };

  // Fonction pour rafraîchir la config
  const refreshConfig = async () => {
    await fetchConfig();
  };

  const value = {
    config,
    loading,
    error,
    getCategoryById,
    getVatRate,
    isPaymentMethodEnabled,
    refreshConfig,
  };

  return (
    <StoreConfigContext.Provider value={value}>
      {children}
    </StoreConfigContext.Provider>
  );
};
