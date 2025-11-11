import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCashRegister } from '../context/CashRegisterContext';
import { useProducts } from '../hooks/useProducts';
import CategoryTabs from '../components/products/CategoryTabs';
import ProductGrid from '../components/products/ProductGrid';
import PaymentModal from '../components/payment/PaymentModal';
import OpenCashRegisterModal from '../components/cashRegister/OpenCashRegisterModal';
import CloseCashRegisterModal from '../components/cashRegister/CloseCashRegisterModal';
import Button from '../components/ui/Button';
import { LogOut, RefreshCw, CheckCircle, CreditCard, DollarSign, Receipt, BarChart3, Package, Users } from 'lucide-react';
import { formatPrice } from '../utils/constants';

const POSPage = () => {
  const { user, logout, isAuthenticated } = useAuth();
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
  } = useCart();

  // Utilisation du CashRegisterContext
  const { activeCashRegister, loading: cashRegisterLoading, hasActiveCashRegister } = useCashRegister();

  // État du modal de paiement
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // État des modals de caisse
  const [isOpenCashRegisterModalOpen, setIsOpenCashRegisterModalOpen] = useState(false);
  const [isCloseCashRegisterModalOpen, setIsCloseCashRegisterModalOpen] = useState(false);

  // Notification de succès
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Ouvrir automatiquement le modal de caisse si aucune caisse n'est ouverte
  useEffect(() => {
    if (!cashRegisterLoading && !hasActiveCashRegister()) {
      setIsOpenCashRegisterModalOpen(true);
    }
  }, [cashRegisterLoading, hasActiveCashRegister]);

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const cartTotal = getTotal();
  const itemCount = getItemCount();

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🍔 BensBurger POS</h1>
          <p className="text-sm text-gray-600">
            Caissier : {user.first_name} {user.last_name}
            {user.role === 'admin' && (
              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                Admin
              </span>
            )}
          </p>
          {/* Statut de la caisse */}
          {hasActiveCashRegister() && activeCashRegister && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <DollarSign size={14} />
              Caisse: {activeCashRegister.register_name} - Fond: {formatPrice(activeCashRegister.opening_balance)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Bouton gestion caisse */}
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
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2"
          >
            <Receipt size={20} />
            Journal
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <BarChart3 size={20} />
            Dashboard
          </Button>
          {user.role === 'admin' && (
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/products')}
                className="flex items-center gap-2"
              >
                <Package size={20} />
                Produits
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/users')}
                className="flex items-center gap-2"
              >
                <Users size={20} />
                Utilisateurs
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="md"
            onClick={refresh}
            className="flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Actualiser
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut size={20} />
            Déconnexion
          </Button>
        </div>
      </header>

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
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
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
        <div className="w-96 bg-white shadow-lg p-6 flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold mb-4 flex-shrink-0">Panier</h2>

          {/* Liste des items */}
          <div className="flex-1 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-6xl mb-4 block">🛒</span>
                <p>Panier vide</p>
                <p className="text-sm mt-2">
                  Cliquez sur un produit pour l'ajouter
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-800 flex-1">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Contrôles quantité */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrementQuantity(item.id)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 font-bold"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold">
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
                        <p className="text-sm text-gray-600">
                          {formatPrice(item.price_ttc)} × {item.quantity}
                        </p>
                        <p className="font-bold text-primary-600">
                          {formatPrice(parseFloat(item.price_ttc) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total et bouton payer */}
          <div className="border-t pt-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Total TTC :</span>
              <span className="text-3xl font-bold text-primary-500">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <Button
              variant="success"
              size="xl"
              disabled={cart.length === 0}
              className="w-full"
              onClick={handleOpenPayment}
            >
              Payer ({itemCount} {itemCount > 1 ? 'articles' : 'article'})
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de paiement */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cart={cart}
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
    </div>
  );
};

export default POSPage;
