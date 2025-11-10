import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const POSPage = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🍔 BensBurger POS</h1>
          <p className="text-sm text-gray-600">
            Caissier : {user.first_name} {user.last_name}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary flex items-center gap-2"
        >
          <LogOut size={20} />
          Déconnexion
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Zone produits */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow p-6 h-full">
            <h2 className="text-xl font-semibold mb-4">Produits</h2>
            <p className="text-gray-600">
              L'interface de vente sera implémentée dans la Phase 1.3
            </p>
          </div>
        </div>

        {/* Zone panier */}
        <div className="w-96 bg-white shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Panier</h2>
          <div className="flex flex-col h-full">
            <div className="flex-1 mb-4">
              <p className="text-gray-600 text-center py-8">
                Panier vide
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total TTC :</span>
                <span className="text-3xl font-bold text-primary-500">0,00 €</span>
              </div>

              <button
                disabled
                className="btn btn-success btn-lg w-full"
              >
                Payer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPage;
