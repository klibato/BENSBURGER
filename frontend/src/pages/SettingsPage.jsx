import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../context/StoreConfigContext';
import { useLanguage } from '../context/LanguageContext';
import { getSettings, updateSettings } from '../services/settingsService';
import Button from '../components/ui/Button';
import { ArrowLeft, Save, Store, Package, Percent, CreditCard, Palette, Plus, Trash2, Smartphone, Printer, Mail } from 'lucide-react';

const SettingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { refreshConfig } = useStoreConfig();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    store_name: '',
    store_description: '',
    address_line1: '',
    address_line2: '',
    postal_code: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    legal_form: '',
    capital_amount: '',
    siret: '',
    vat_number: '',
    rcs: '',
    currency: 'EUR',
    currency_symbol: '€',
    theme_color: '#FF6B35',
    logo_url: '',
    language: 'fr-FR',
    timezone: 'Europe/Paris',
    categories: [],
    vat_rates: [],
    payment_methods: {},
    sumup_config: {
      enabled: false,
      api_key: '',
      merchant_code: '',
      affiliate_key: '',
    },
    printer_config: {
      enabled: false,
      type: 'epson',
      interface: 'tcp',
      ip: '',
      port: 9100,
      path: '',
      auto_print: true,
    },
    email_config: {
      enabled: false,
      smtp_host: '',
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: '',
      smtp_password: '',
      from_email: '',
      from_name: '',
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchSettings();
  }, [isAuthenticated, user, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();

      // Normaliser les données pour garantir que les tableaux/objets existent
      const normalizedSettings = {
        ...response.data,
        categories: response.data.categories || [],
        vat_rates: response.data.vat_rates || [],
        payment_methods: response.data.payment_methods || {},
        theme_color: response.data.theme_color || '#FF6B35',
        currency: response.data.currency || 'EUR',
        currency_symbol: response.data.currency_symbol || '€',
        language: response.data.language || 'fr-FR',
        timezone: response.data.timezone || 'Europe/Paris',
        sumup_config: response.data.sumup_config || {
          enabled: false,
          api_key: '',
          merchant_code: '',
          affiliate_key: '',
        },
        printer_config: response.data.printer_config || {
          enabled: false,
          type: 'epson',
          interface: 'tcp',
          ip: '',
          port: 9100,
          path: '',
          auto_print: true,
        },
        email_config: response.data.email_config || {
          enabled: false,
          smtp_host: '',
          smtp_port: 587,
          smtp_secure: false,
          smtp_user: '',
          smtp_password: '',
          from_email: '',
          from_name: '',
        },
      };

      setSettings(normalizedSettings);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await updateSettings(settings);
      setSuccessMessage('Paramètres enregistrés avec succès !');
      setSettings(response.data);

      // Rafraîchir la configuration globale
      await refreshConfig();

      // Masquer le message après 3 secondes
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setSaving(false);
    }
  };

  // Gestion des catégories
  const addCategory = () => {
    setSettings((prev) => ({
      ...prev,
      categories: [
        ...(prev.categories || []),
        {
          id: `cat_${Date.now()}`,
          name: '',
          icon: '📦',
          color: '#6B7280',
        },
      ],
    }));
  };

  const updateCategory = (index, field, value) => {
    setSettings((prev) => {
      const currentCategories = prev.categories || [];
      const newCategories = [...currentCategories];
      newCategories[index] = {
        ...newCategories[index],
        [field]: value,
      };
      return { ...prev, categories: newCategories };
    });
  };

  const removeCategory = (index) => {
    setSettings((prev) => ({
      ...prev,
      categories: (prev.categories || []).filter((_, i) => i !== index),
    }));
  };

  // Gestion des taux de TVA
  const addVatRate = () => {
    setSettings((prev) => ({
      ...prev,
      vat_rates: [
        ...(prev.vat_rates || []),
        {
          rate: 20,
          name: '',
          description: '',
        },
      ],
    }));
  };

  const updateVatRate = (index, field, value) => {
    setSettings((prev) => {
      const currentVatRates = prev.vat_rates || [];
      const newVatRates = [...currentVatRates];
      newVatRates[index] = {
        ...newVatRates[index],
        [field]: field === 'rate' ? parseFloat(value) : value,
      };
      return { ...prev, vat_rates: newVatRates };
    });
  };

  const removeVatRate = (index) => {
    setSettings((prev) => ({
      ...prev,
      vat_rates: (prev.vat_rates || []).filter((_, i) => i !== index),
    }));
  };

  // Gestion des moyens de paiement
  const togglePaymentMethod = (method) => {
    setSettings((prev) => {
      const currentPaymentMethods = prev.payment_methods || {};
      return {
        ...prev,
        payment_methods: {
          ...currentPaymentMethods,
          [method]: {
            ...(currentPaymentMethods[method] || {}),
            enabled: !(currentPaymentMethods[method]?.enabled),
          },
        },
      };
    });
  };

  const updatePaymentMethodName = (method, name) => {
    setSettings((prev) => {
      const currentPaymentMethods = prev.payment_methods || {};
      return {
        ...prev,
        payment_methods: {
          ...currentPaymentMethods,
          [method]: {
            ...(currentPaymentMethods[method] || {}),
            name: name,
          },
        },
      };
    });
  };

  // Gestion configuration SumUp
  const updateSumUpConfig = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      sumup_config: {
        ...(prev.sumup_config || {}),
        [field]: value,
      },
    }));
  };

  // Gestion configuration imprimante
  const updatePrinterConfig = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      printer_config: {
        ...(prev.printer_config || {}),
        [field]: value,
      },
    }));
  };

  // Gestion configuration email
  const updateEmailConfig = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      email_config: {
        ...(prev.email_config || {}),
        [field]: value,
      },
    }));
  };

  const tabs = [
    { id: 'general', label: 'Informations générales', icon: Store },
    { id: 'categories', label: 'Catégories', icon: Package },
    { id: 'vat', label: 'Taux de TVA', icon: Percent },
    { id: 'payment', label: 'Moyens de paiement', icon: CreditCard },
    { id: 'sumup', label: 'SumUp', icon: Smartphone },
    { id: 'printer', label: 'Imprimante', icon: Printer },
    { id: 'email', label: 'Email / SMTP', icon: Mail },
    { id: 'appearance', label: 'Apparence', icon: Palette },
  ];

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Store size={28} />
              Paramètres du Commerce
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configuration complète de votre commerce
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des paramètres...</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-2">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tab: Informations générales */}
              {activeTab === 'general' && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                      Informations du commerce
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Nom du commerce *
                        </label>
                        <input
                          type="text"
                          name="store_name"
                          value={settings.store_name}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          name="store_description"
                          value={settings.store_description}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Adresse ligne 1
                        </label>
                        <input
                          type="text"
                          name="address_line1"
                          value={settings.address_line1}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Adresse ligne 2
                        </label>
                        <input
                          type="text"
                          name="address_line2"
                          value={settings.address_line2 || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Code postal
                        </label>
                        <input
                          type="text"
                          name="postal_code"
                          value={settings.postal_code}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Ville
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={settings.city}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Pays
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={settings.country}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={settings.phone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={settings.email || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Site web
                        </label>
                        <input
                          type="url"
                          name="website"
                          value={settings.website || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                      Informations légales
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Forme juridique
                        </label>
                        <select
                          name="legal_form"
                          value={settings.legal_form}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="SARL">SARL</option>
                          <option value="SAS">SAS</option>
                          <option value="EURL">EURL</option>
                          <option value="SA">SA</option>
                          <option value="EI">Entreprise Individuelle</option>
                          <option value="Auto-Entrepreneur">Auto-Entrepreneur</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Capital social (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="capital_amount"
                          value={settings.capital_amount}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          SIRET (14 chiffres)
                        </label>
                        <input
                          type="text"
                          name="siret"
                          value={settings.siret}
                          onChange={handleChange}
                          maxLength="14"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Numéro TVA
                        </label>
                        <input
                          type="text"
                          name="vat_number"
                          value={settings.vat_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          RCS (Registre du Commerce et des Sociétés)
                        </label>
                        <input
                          type="text"
                          name="rcs"
                          value={settings.rcs}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Tab: Catégories */}
              {activeTab === 'categories' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Catégories de produits
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Gérez les catégories affichées dans votre caisse
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={addCategory}
                      className="flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {settings.categories?.map((category, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <input
                          type="text"
                          value={category.icon}
                          onChange={(e) => updateCategory(index, 'icon', e.target.value)}
                          placeholder="Emoji"
                          className="w-16 text-center px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        />
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => updateCategory(index, 'name', e.target.value)}
                          placeholder="Nom de la catégorie"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        />
                        <input
                          type="text"
                          value={category.id}
                          onChange={(e) => updateCategory(index, 'id', e.target.value)}
                          placeholder="ID (unique)"
                          className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg font-mono text-sm"
                        />
                        <input
                          type="color"
                          value={category.color}
                          onChange={(e) => updateCategory(index, 'color', e.target.value)}
                          className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => removeCategory(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}

                    {settings.categories?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Aucune catégorie configurée. Cliquez sur "Ajouter" pour créer une catégorie.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Taux de TVA */}
              {activeTab === 'vat' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Taux de TVA
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Configurez les différents taux de TVA applicables
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={addVatRate}
                      className="flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {settings.vat_rates?.map((vat, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <input
                          type="number"
                          step="0.01"
                          value={vat.rate}
                          onChange={(e) => updateVatRate(index, 'rate', e.target.value)}
                          placeholder="Taux (%)"
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        />
                        <input
                          type="text"
                          value={vat.name}
                          onChange={(e) => updateVatRate(index, 'name', e.target.value)}
                          placeholder="Nom (ex: TVA réduite)"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        />
                        <input
                          type="text"
                          value={vat.description}
                          onChange={(e) => updateVatRate(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeVatRate(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}

                    {settings.vat_rates?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Aucun taux de TVA configuré. Cliquez sur "Ajouter" pour créer un taux.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Moyens de paiement */}
              {activeTab === 'payment' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    Moyens de paiement
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Activez ou désactivez les moyens de paiement disponibles dans votre caisse
                  </p>

                  <div className="space-y-3">
                    {['cash', 'card', 'meal_voucher', 'mixed'].map((method) => {
                      const methodNames = {
                        cash: 'Espèces',
                        card: 'Carte bancaire',
                        meal_voucher: 'Tickets restaurant',
                        mixed: 'Paiement mixte',
                      };

                      const isEnabled = settings.payment_methods?.[method]?.enabled ?? false;
                      const currentName = settings.payment_methods?.[method]?.name || methodNames[method];

                      return (
                        <div key={method} className="flex gap-3 items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <button
                            type="button"
                            onClick={() => togglePaymentMethod(method)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                isEnabled ? 'transform translate-x-6' : ''
                              }`}
                            />
                          </button>

                          <input
                            type="text"
                            value={currentName}
                            onChange={(e) => updatePaymentMethodName(method, e.target.value)}
                            placeholder={methodNames[method]}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                          />

                          <span className={`text-sm font-medium ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {isEnabled ? 'Activé' : 'Désactivé'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: SumUp */}
              {activeTab === 'sumup' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Configuration SumUp
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Configurez votre intégration avec SumUp pour les paiements par carte
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSumUpConfig('enabled', !settings.sumup_config?.enabled)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        settings.sumup_config?.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                          settings.sumup_config?.enabled ? 'transform translate-x-7' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        API Key *
                      </label>
                      <input
                        type="password"
                        value={settings.sumup_config?.api_key || ''}
                        onChange={(e) => updateSumUpConfig('api_key', e.target.value)}
                        placeholder="Votre clé API SumUp"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Disponible dans votre espace développeur SumUp
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Merchant Code
                      </label>
                      <input
                        type="text"
                        value={settings.sumup_config?.merchant_code || ''}
                        onChange={(e) => updateSumUpConfig('merchant_code', e.target.value)}
                        placeholder="Code marchand SumUp"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Affiliate Key (optionnel)
                      </label>
                      <input
                        type="text"
                        value={settings.sumup_config?.affiliate_key || ''}
                        onChange={(e) => updateSumUpConfig('affiliate_key', e.target.value)}
                        placeholder="Clé affilié SumUp"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-semibold text-indigo-900 mb-2">📱 Obtenir vos identifiants SumUp</h4>
                      <ol className="text-sm text-indigo-700 space-y-1 list-decimal list-inside">
                        <li>Connectez-vous à votre compte SumUp</li>
                        <li>Accédez à "Développeurs" {'>'} "API Keys"</li>
                        <li>Créez une nouvelle clé API ou copiez votre clé existante</li>
                        <li>Collez la clé ci-dessus et sauvegardez</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Imprimante */}
              {activeTab === 'printer' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Configuration Imprimante
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Configurez votre imprimante thermique ESC/POS
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrinterConfig('enabled', !settings.printer_config?.enabled)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        settings.printer_config?.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                          settings.printer_config?.enabled ? 'transform translate-x-7' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Type d'imprimante
                        </label>
                        <select
                          value={settings.printer_config?.type || 'epson'}
                          onChange={(e) => updatePrinterConfig('type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="epson">EPSON</option>
                          <option value="star">Star</option>
                          <option value="tanca">Tanca</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Interface
                        </label>
                        <select
                          value={settings.printer_config?.interface || 'tcp'}
                          onChange={(e) => updatePrinterConfig('interface', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="tcp">Réseau (TCP/IP)</option>
                          <option value="usb">USB</option>
                          <option value="printer">Imprimante système</option>
                        </select>
                      </div>
                    </div>

                    {settings.printer_config?.interface === 'tcp' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Adresse IP *
                          </label>
                          <input
                            type="text"
                            value={settings.printer_config?.ip || ''}
                            onChange={(e) => updatePrinterConfig('ip', e.target.value)}
                            placeholder="192.168.1.100"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Port
                          </label>
                          <input
                            type="number"
                            value={settings.printer_config?.port || 9100}
                            onChange={(e) => updatePrinterConfig('port', parseInt(e.target.value))}
                            placeholder="9100"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    )}

                    {(settings.printer_config?.interface === 'usb' || settings.printer_config?.interface === 'printer') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Chemin / Nom de l'imprimante *
                        </label>
                        <input
                          type="text"
                          value={settings.printer_config?.path || ''}
                          onChange={(e) => updatePrinterConfig('path', e.target.value)}
                          placeholder="/dev/usb/lp0 ou nom de l'imprimante"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="auto_print"
                        checked={settings.printer_config?.auto_print ?? true}
                        onChange={(e) => updatePrinterConfig('auto_print', e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="auto_print" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Impression automatique après paiement
                      </label>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">🖨️ Configuration réseau</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        Pour une imprimante réseau (TCP/IP):
                      </p>
                      <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Connectez l'imprimante à votre réseau</li>
                        <li>Notez son adresse IP (généralement sur l'imprimante)</li>
                        <li>Le port par défaut est 9100</li>
                        <li>Testez la connexion après sauvegarde</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Email / SMTP */}
              {activeTab === 'email' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Configuration Email / SMTP
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Configurez l'envoi d'emails (tickets, notifications)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateEmailConfig('enabled', !settings.email_config?.enabled)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        settings.email_config?.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                          settings.email_config?.enabled ? 'transform translate-x-7' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Serveur SMTP *
                        </label>
                        <input
                          type="text"
                          value={settings.email_config?.smtp_host || ''}
                          onChange={(e) => updateEmailConfig('smtp_host', e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Port *
                        </label>
                        <input
                          type="number"
                          value={settings.email_config?.smtp_port || 587}
                          onChange={(e) => updateEmailConfig('smtp_port', parseInt(e.target.value))}
                          placeholder="587"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="smtp_secure"
                        checked={settings.email_config?.smtp_secure ?? false}
                        onChange={(e) => updateEmailConfig('smtp_secure', e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="smtp_secure" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Connexion sécurisée SSL/TLS (port 465)
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Utilisateur SMTP *
                        </label>
                        <input
                          type="text"
                          value={settings.email_config?.smtp_user || ''}
                          onChange={(e) => updateEmailConfig('smtp_user', e.target.value)}
                          placeholder="votre@email.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Mot de passe SMTP *
                        </label>
                        <input
                          type="password"
                          value={settings.email_config?.smtp_password || ''}
                          onChange={(e) => updateEmailConfig('smtp_password', e.target.value)}
                          placeholder="Mot de passe"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Email expéditeur *
                        </label>
                        <input
                          type="email"
                          value={settings.email_config?.from_email || ''}
                          onChange={(e) => updateEmailConfig('from_email', e.target.value)}
                          placeholder="noreply@votrecommerce.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Nom expéditeur
                        </label>
                        <input
                          type="text"
                          value={settings.email_config?.from_name || ''}
                          onChange={(e) => updateEmailConfig('from_name', e.target.value)}
                          placeholder="BensBurger"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">📧 Exemples de configuration</h4>
                      <div className="text-sm text-yellow-700 space-y-2">
                        <div>
                          <strong>Gmail:</strong>
                          <ul className="list-disc list-inside ml-2">
                            <li>Serveur: smtp.gmail.com</li>
                            <li>Port: 587 (TLS) ou 465 (SSL)</li>
                            <li>Utilisez un mot de passe d'application si 2FA activé</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Outlook/Office365:</strong>
                          <ul className="list-disc list-inside ml-2">
                            <li>Serveur: smtp.office365.com</li>
                            <li>Port: 587</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Apparence */}
              {activeTab === 'appearance' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    Apparence et branding
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Couleur du thème
                      </label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          name="theme_color"
                          value={settings.theme_color}
                          onChange={handleChange}
                          className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          name="theme_color"
                          value={settings.theme_color}
                          onChange={handleChange}
                          placeholder="#FF6B35"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cette couleur sera utilisée pour les boutons et les éléments actifs
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        URL du logo
                      </label>
                      <input
                        type="url"
                        name="logo_url"
                        value={settings.logo_url || ''}
                        onChange={handleChange}
                        placeholder="https://exemple.com/logo.png"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Lien vers votre logo (affiché sur les tickets et l'interface)
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Devise
                        </label>
                        <select
                          name="currency"
                          value={settings.currency}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        >
                          <option value="EUR">EUR - Euro</option>
                          <option value="USD">USD - Dollar US</option>
                          <option value="GBP">GBP - Livre Sterling</option>
                          <option value="CHF">CHF - Franc Suisse</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Symbole
                        </label>
                        <input
                          type="text"
                          name="currency_symbol"
                          value={settings.currency_symbol}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Fuseau horaire
                      </label>
                      <select
                        name="timezone"
                        value={settings.timezone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                      >
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Note: La langue et le thème se configurent depuis le menu burger
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
