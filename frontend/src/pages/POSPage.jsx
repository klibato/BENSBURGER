import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCashRegister } from '../context/CashRegisterContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useProducts } from '../hooks/useProducts';
import CategoryTabs from '../components/products/CategoryTabs';
import ProductGrid from '../components/products/ProductGrid';
import PaymentModal from '../components/payment/PaymentModal';
import OpenCashRegisterModal from '../components/cashRegister/OpenCashRegisterModal';
import CloseCashRegisterModal from '../components/cashRegister/CloseCashRegisterModal';
import QuickSwitchCashierModal from '../components/auth/QuickSwitchCashierModal';
import Button from '../components/ui/Button';
import { LogOut, RefreshCw, CheckCircle, CreditCard, DollarSign, Receipt, BarChart3, Package, Users, Settings, Percent, Tag, X, UserCircle, FileText, Menu, Globe, Moon, Sun } from 'lucide-react';
import { formatPrice } from '../utils/constants';

const POSPage = () => {
  const { user, logout, switchCashier, isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const {
    products,
    loading,
    error,
    selectedCategory,
    changeCategory,
    refresh,
  } = useProducts();

  // Utilisation du CartContext
  const {
    cart,
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getTotal,
    getItemCount,
    discount,
    applyDiscount,
    removeDiscount,
  } = useCart();

  // Utilisation du CashRegisterContext
  const { activeCashRegister, loading: cashRegisterLoading, hasActiveCashRegister } = useCashRegister();

  // État du modal de paiement
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // État des modals de caisse
  const [isOpenCashRegisterModalOpen, setIsOpenCashRegisterModalOpen] = useState(false);
  const [isCloseCashRegisterModalOpen, setIsCloseCashRegisterModalOpen] = useState(false);

  // État de la modal de changement de caissier
  const [isSwitchCashierModalOpen, setIsSwitchCashierModalOpen] = useState(false);
  const [isSwitchingCashier, setIsSwitchingCashier] = useState(false);

  // État du menu burger
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Notification de succès
  const [successMessage, setSuccessMessage] = useState(null);

  // État pour l'UI de remise
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' ou 'amount'
  const [discountValue, setDiscountValue] = useState('');

  useEffect(() => {
    // Ne pas rediriger si on est en train de changer de caissier
    if (!isAuthenticated && !isSwitchingCashier) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate, isSwitchingCashier]);

  // Ouvrir automatiquement le modal de caisse si aucune caisse n'est ouverte
  useEffect(() => {
    if (!cashRegisterLoading && !activeCashRegister) {
      setIsOpenCashRegisterModalOpen(true);
    } else if (activeCashRegister) {
      // Fermer le modal si une caisse est maintenant ouverte
      setIsOpenCashRegisterModalOpen(false);
    }
  }, [cashRegisterLoading, activeCashRegister]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchCashier = async (username, pin) => {
    setIsSwitchingCashier(true);
    try {
      const result = await switchCashier(username, pin);
      if (!result.success) {
        throw new Error(result.error);
      }
      // Succès : le contexte Auth a été mis à jour automatiquement
      // La caisse reste ouverte
    } finally {
      setIsSwitchingCashier(false);
    }
  };

  const handleProductClick = (product) => {
    // Vérifier qu'une caisse est ouverte
    if (!hasActiveCashRegister()) {
      alert('Veuillez ouvrir une caisse avant de commencer à vendre.');
      return;
    }
    addToCart(product);
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (sale) => {
    // Vider le panier
    clearCart();

    // Afficher message de succès
    setSuccessMessage({
      ticketNumber: sale.ticket_number,
      total: sale.total_ttc,
      change: sale.change_given,
    });

    // Masquer après 5 secondes
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const { subtotal, discountAmount, total: cartTotal, hasDiscount } = getTotal();
  const itemCount = getItemCount();

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      alert('Veuillez entrer une valeur valide');
      return;
    }

    if (discountType === 'percentage' && value > 100) {
      alert('Le pourcentage ne peut pas dépasser 100%');
      return;
    }

    applyDiscount({ type: discountType, value });
    setShowDiscountInput(false);
    setDiscountValue('');
  };

  const handleRemoveDiscount = () => {
    removeDiscount();
    setDiscountValue('');
  };

  const navigateTo = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleMenuAction = (action) => {
    action();
    setIsMenuOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🍔 {t('pos.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('pos.cashier')} : {user.first_name} {user.last_name}
            {user.role === 'admin' && (
              <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded">
                {t('auth.admin')}
              </span>
            )}
          </p>
          {/* Statut de la caisse */}
          {hasActiveCashRegister() && activeCashRegister && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
              <DollarSign size={14} />
              {t('pos.cashRegister')}: {activeCashRegister.register_name} - Fond: {formatPrice(activeCashRegister.opening_balance)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Bouton gestion caisse - toujours visible */}
          {hasActiveCashRegister() ? (
            <Button
              variant="danger"
              size="md"
              onClick={() => setIsCloseCashRegisterModalOpen(true)}
              className="flex items-center gap-2"
            >
              <CreditCard size={20} />
              Fermer caisse
            </Button>
          ) : (
            <Button
              variant="success"
              size="md"
              onClick={() => setIsOpenCashRegisterModalOpen(true)}
              className="flex items-center gap-2"
            >
              <CreditCard size={20} />
              Ouvrir caisse
            </Button>
          )}

          {/* Bouton changer caissier - toujours visible */}
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsSwitchCashierModalOpen(true)}
            className="flex items-center gap-2"
          >
            <UserCircle size={20} />
            Changer caissier
          </Button>

          {/* Bouton menu burger */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-2"
          >
            <Menu size={20} />
            Menu
          </Button>
        </div>
      </header>

      {/* Menu burger slide-in */}
      {isMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu slide-in */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
            {/* Header du menu */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <UserCircle className="w-8 h-8" />
                </div>
                <div>
                  <div className="font-semibold">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-blue-100 text-sm capitalize">{user?.role}</div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
              <nav className="p-4">
                <div className="space-y-1">
                  {/* Dashboard */}
                  <button
                    onClick={() => navigateTo('/dashboard')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('dashboard.title')}</span>
                  </button>

                  {/* Journal des ventes */}
                  <button
                    onClick={() => navigateTo('/sales')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('sales.title')}</span>
                  </button>

                  {/* Actualiser */}
                  <button
                    onClick={() => handleMenuAction(refresh)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{t('common.refresh')}</span>
                  </button>

                  {/* Admin uniquement */}
                  {user?.role === 'admin' && (
                    <>
                      <div className="pt-4 pb-2">
                        <div className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Administration
                        </div>
                      </div>

                      <button
                        onClick={() => navigateTo('/products')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <Package className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{t('products.title')}</span>
                      </button>

                      <button
                        onClick={() => navigateTo('/users')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{t('users.title')}</span>
                      </button>

                      <button
                        onClick={() => navigateTo('/settings')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{t('settings.title')}</span>
                      </button>

                      <button
                        onClick={() => navigateTo('/logs')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{t('logs.title')}</span>
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>

            {/* Préférences */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Préférences
              </div>

              {/* Language selector */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.language')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLanguage('fr')}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      language === 'fr'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Français
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      language === 'en'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Theme selector */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.theme')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    {t('settings.lightMode')}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    {t('settings.darkMode')}
                  </button>
                </div>
              </div>
            </div>

            {/* Déconnexion en bas */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleMenuAction(handleLogout)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('auth.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notification de succès */}
      {successMessage && (
        <div className="bg-green-500 text-white px-6 py-4 flex items-center justify-between animate-slide-in-right">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} />
            <div>
              <p className="font-bold">Paiement réussi !</p>
              <p className="text-sm">
                Ticket {successMessage.ticketNumber} - Total: {formatPrice(successMessage.total)}
                {successMessage.change > 0 && ` - Rendu: ${formatPrice(successMessage.change)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-white hover:text-green-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Zone produits */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Avertissement si pas de caisse ouverte */}
            {!hasActiveCashRegister() && !cashRegisterLoading && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-200">
                      <strong>Caisse non ouverte :</strong> Veuillez ouvrir une caisse pour commencer à vendre.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Onglets catégories */}
            <CategoryTabs
              selectedCategory={selectedCategory}
              onCategoryChange={changeCategory}
            />

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Grille de produits */}
            <ProductGrid
              products={products}
              onProductClick={handleProductClick}
              loading={loading}
            />
          </div>
        </div>

        {/* Zone panier */}
        <div className="w-96 bg-white dark:bg-gray-800 shadow-lg p-6 flex flex-col overflow-hidden border-l dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex-shrink-0 text-gray-800 dark:text-gray-100">{t('pos.cart')}</h2>

          {/* Liste des items */}
          <div className="flex-1 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="text-6xl mb-4 block">🛒</span>
                <p>{t('pos.emptyCart')}</p>
                <p className="text-sm mt-2">
                  {t('pos.clickToAdd')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          {item.name}
                          {item.is_menu && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              📦 {t('products.menu')}
                            </span>
                          )}
                        </h3>
                        {/* Afficher la composition du menu */}
                        {item.is_menu && item.menu_composition && item.menu_composition.length > 0 && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-purple-300 dark:border-purple-600">
                            {item.menu_composition.map((comp, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span>• {comp.quantity}x {comp.product_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-2"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Contrôles quantité */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrementQuantity(item.id)}
                          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95 font-bold text-gray-800 dark:text-gray-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-800 dark:text-gray-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => incrementQuantity(item.id)}
                          className="w-8 h-8 rounded-full bg-primary-500 text-white hover:bg-primary-600 active:scale-95 font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Prix */}
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatPrice(item.price_ttc)} × {item.quantity}
                        </p>
                        <p className="font-bold text-primary-600 dark:text-primary-400">
                          {formatPrice(parseFloat(item.price_ttc) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remise et Total */}
          <div className="border-t dark:border-gray-700 pt-4 flex-shrink-0">
            {/* Bouton remise */}
            {!hasDiscount && !showDiscountInput && cart.length > 0 && (
              <button
                onClick={() => setShowDiscountInput(true)}
                className="w-full mb-3 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors flex items-center justify-center gap-2"
              >
                <Tag size={18} />
                <span className="text-sm font-medium">{t('pos.applyDiscount')}</span>
              </button>
            )}

            {/* Input remise */}
            {showDiscountInput && (
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                  >
                    <option value="percentage">%</option>
                    <option value="amount">€</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? '10' : '5.00'}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyDiscount}
                    className="flex-1 py-1 px-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded text-sm font-medium hover:bg-yellow-700 dark:hover:bg-yellow-600"
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    onClick={() => {
                      setShowDiscountInput(false);
                      setDiscountValue('');
                    }}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Affichage remise active */}
            {hasDiscount && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                    {t('pos.discount')}: {discount.type === 'percentage' ? `${discount.value}%` : `${discount.value}€`}
                  </span>
                </div>
                <button
                  onClick={handleRemoveDiscount}
                  className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-800/50 rounded transition-colors"
                  title={t('pos.removeDiscount')}
                >
                  <X size={16} className="text-yellow-600 dark:text-yellow-400" />
                </button>
              </div>
            )}

            {/* Détail du total */}
            <div className="space-y-2 mb-4">
              {hasDiscount && (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>Sous-total:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-yellow-600 dark:text-yellow-400">
                    <span>{t('pos.discount')}:</span>
                    <span>- {formatPrice(discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
                <span className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pos.total')} :</span>
                <span className="text-3xl font-bold text-primary-500 dark:text-primary-400">
                  {formatPrice(cartTotal)}
                </span>
              </div>
            </div>

            <Button
              variant="success"
              size="xl"
              disabled={cart.length === 0}
              className="w-full"
              onClick={handleOpenPayment}
            >
              {t('pos.pay')} ({itemCount} {itemCount > 1 ? t('pos.items') : t('pos.item')})
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de paiement */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cart={cart}
        discount={discount}
        onSuccess={handlePaymentSuccess}
      />

      {/* Modal ouverture de caisse */}
      <OpenCashRegisterModal
        isOpen={isOpenCashRegisterModalOpen}
        onClose={() => setIsOpenCashRegisterModalOpen(false)}
      />

      {/* Modal fermeture de caisse */}
      <CloseCashRegisterModal
        isOpen={isCloseCashRegisterModalOpen}
        onClose={() => setIsCloseCashRegisterModalOpen(false)}
        cashRegister={activeCashRegister}
      />

      {/* Modal changement de caissier */}
      <QuickSwitchCashierModal
        isOpen={isSwitchCashierModalOpen}
        onClose={() => setIsSwitchCashierModalOpen(false)}
        onSwitch={handleSwitchCashier}
      />
    </div>
  );
};

export default POSPage;
