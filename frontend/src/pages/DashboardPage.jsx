import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import Button from '../components/ui/Button';
import { ArrowLeft, TrendingUp, ShoppingCart, DollarSign, CreditCard, RefreshCw, Download } from 'lucide-react';
import { formatPrice } from '../utils/constants';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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

  // Export cash register closures to CSV
  const handleExportCashRegistersCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/cash-registers/export/csv`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clotures_caisse_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export CSV clôtures:', error);
      alert('Erreur lors de l\'export CSV des clôtures de caisse');
    }
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

  // Couleurs pour les graphiques
  const CHART_COLORS = {
    primary: '#10b981',    // green
    secondary: '#3b82f6',  // blue
    accent: '#f59e0b',     // orange
    purple: '#8b5cf6',     // purple
    indigo: '#6366f1',     // indigo
    pink: '#ec4899',       // pink
    teal: '#14b8a6',       // teal
  };

  const PAYMENT_COLORS = {
    cash: CHART_COLORS.primary,
    card: CHART_COLORS.secondary,
    meal_voucher: CHART_COLORS.accent,
    mixed: CHART_COLORS.purple,
    sumup: CHART_COLORS.indigo,
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
          {user?.role === 'admin' && (
            <Button
              variant="primary"
              size="md"
              onClick={handleExportCashRegistersCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download size={20} />
              Export Clôtures
            </Button>
          )}
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
                    🏆 Top 5 Produits
                  </h3>
                </div>
                <div className="p-6">
                  {stats.top_products.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune vente</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={stats.top_products.map((product, index) => ({
                          name: product.product_name.length > 15
                            ? product.product_name.substring(0, 15) + '...'
                            : product.product_name,
                          'CA (€)': parseFloat(product.total_revenue),
                          'Quantité': parseInt(product.total_quantity),
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={95}
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value, name) => {
                            if (name === 'CA (€)') {
                              return [formatPrice(value), name];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="CA (€)" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]} />
                        <Bar dataKey="Quantité" fill={CHART_COLORS.secondary} radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Ventes par mode de paiement */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    💳 Modes de paiement
                  </h3>
                </div>
                <div className="p-6">
                  {stats.sales_by_payment_method.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune vente</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.sales_by_payment_method.map((payment) => ({
                            name: getPaymentMethodLabel(payment.payment_method),
                            value: parseFloat(payment.total),
                            count: payment.count,
                            method: payment.payment_method,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {stats.sales_by_payment_method.map((payment, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PAYMENT_COLORS[payment.payment_method] || CHART_COLORS.accent}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value, name, props) => {
                            return [
                              `${formatPrice(value)} (${props.payload.count} transaction${props.payload.count > 1 ? 's' : ''})`,
                              name
                            ];
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Ventes par jour */}
            {stats.sales_by_day.length > 0 && (
              <div className="bg-white rounded-lg shadow mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    📈 Évolution des ventes
                  </h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart
                      data={stats.sales_by_day.map((day) => ({
                        date: new Date(day.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        }),
                        'CA (€)': parseFloat(day.revenue),
                        'Ventes': day.count,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis
                        yAxisId="left"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: '#6b7280' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value, name) => {
                          if (name === 'CA (€)') {
                            return [formatPrice(value), name];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="CA (€)"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.primary, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Ventes"
                        stroke={CHART_COLORS.secondary}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: CHART_COLORS.secondary, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
