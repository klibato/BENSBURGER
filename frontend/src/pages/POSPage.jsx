import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import CategoryTabs from '../components/products/CategoryTabs';
import ProductGrid from '../components/products/ProductGrid';
import PaymentModal from '../components/payment/PaymentModal';
import Button from '../components/ui/Button';
import { LogOut, RefreshCw, CheckCircle } from 'lucide-react';
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

  // État du modal de paiement
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Notification de succès
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProductClick = (product) => {
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
        </div>
        <div className="flex gap-2">
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
    </div>
  );
};

export default POSPage;
