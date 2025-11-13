import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import Button from '../components/ui/Button';
import { ArrowLeft, TrendingUp, ShoppingCart, DollarSign, CreditCard, RefreshCw } from 'lucide-react';
import { formatPrice } from '../utils/constants';
// TEMPORAIRE: Import recharts commenté - à réactiver après installation dans Docker
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
// } from 'recharts';

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardStats(period);
      setStats(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    const labels = {
      today: "Aujourd'hui",
      week: 'Cette semaine',
      month: 'Ce mois',
      year: 'Cette année',
    };
    return labels[period] || 'Aujourd\'hui';
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Espèces',
      card: 'Carte',
      meal_voucher: 'Ticket resto',
      mixed: 'Mixte',
      sumup: 'SumUp',
    };
    return labels[method] || method;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
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
            <h1 className="text-2xl font-bold text-gray-800">📊 Dashboard</h1>
            <p className="text-sm text-gray-600">{getPeriodLabel()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <Button
            variant="secondary"
            size="md"
            onClick={fetchStats}
            className="flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Actualiser
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* CA Total */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">CA Total</h3>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-green-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatPrice(stats.stats.total_revenue)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  HT: {formatPrice(stats.stats.total_ht)}
                </p>
              </div>

              {/* Nombre de ventes */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Ventes</h3>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShoppingCart className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.stats.total_sales}
                </p>
                <p className="text-sm text-gray-500 mt-1">transactions</p>
              </div>

              {/* Panier moyen */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Panier moyen</h3>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="text-purple-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatPrice(stats.stats.average_ticket)}
                </p>
                <p className="text-sm text-gray-500 mt-1">par transaction</p>
              </div>

              {/* Caisses ouvertes */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Caisses ouvertes</h3>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <CreditCard className="text-orange-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.stats.open_registers}
                </p>
                <p className="text-sm text-gray-500 mt-1">actuellement</p>
              </div>
            </div>

            {/* Grid 2 colonnes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top produits */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Top 5 Produits
                  </h3>
                </div>
                <div className="p-6">
                  {stats.top_products.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune vente</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.top_products.map((product, index) => (
                        <div
                          key={product.product_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-600 font-bold">
                                #{index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {product.product_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {product.total_quantity} vendus
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-green-600">
                            {formatPrice(product.total_revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ventes par mode de paiement */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Modes de paiement
                  </h3>
                </div>
                <div className="p-6">
                  {stats.sales_by_payment_method.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune vente</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.sales_by_payment_method.map((payment) => (
                        <div
                          key={payment.payment_method}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {getPaymentMethodLabel(payment.payment_method)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {payment.count} transaction{payment.count > 1 ? 's' : ''}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatPrice(payment.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ventes par jour */}
            {stats.sales_by_day.length > 0 && (
              <div className="bg-white rounded-lg shadow mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Ventes par jour
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {stats.sales_by_day.map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {day.count} vente{day.count > 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className="font-semibold text-green-600">
                          {formatPrice(day.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default DashboardPage;
