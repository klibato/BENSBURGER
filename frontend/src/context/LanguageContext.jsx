import { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get from localStorage or default to 'fr'
    return localStorage.getItem('language') || 'fr';
  });

  useEffect(() => {
    // Save to localStorage whenever language changes
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return getTranslation(language, key);
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
