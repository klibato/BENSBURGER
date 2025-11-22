import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAllSales } from '../services/saleService';
import Button from '../components/ui/Button';
import { ArrowLeft, Search, Filter, Eye, Download, Printer } from 'lucide-react';
import { formatPrice } from '../utils/constants';

const SalesHistoryPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  // Filtres
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    payment_method: '',
    status: 'completed',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchSales();
  }, [filters, pagination.offset]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllSales({
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      setSales(response.data.sales);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('sales.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, offset: 0 })); // Reset pagination
  };

  const handleNextPage = () => {
    if (pagination.has_more) {
      setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      meal_voucher: 'Ticket restaurant',
      mixed: 'Mixte',
    };
    return labels[method] || method;
  };

  const handleDownloadPDF = async (saleId, ticketNumber) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sales/${saleId}/pdf`, {
        method: 'GET',
        credentials: 'include', // Envoie le cookie httpOnly
      });

      if (!response.ok) {
        throw new Error(t('sales.downloadPDFError'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticketNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert(t('sales.downloadPDFError'));
    }
  };

  const handlePrintTicket = async (saleId, ticketNumber) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/printer/sale/${saleId}`, {
        method: 'POST',
        credentials: 'include', // Envoie le cookie httpOnly
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de l\'impression');
      }

      alert(`t('sales.printSuccess').replace('{ticketNumber}', ticketNumber)`);
    } catch (error) {
      console.error('Erreur impression:', error);
      alert(error.message || 'Erreur lors de l\'impression. Vérifiez que l\'imprimante est connectée.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();

      // Ajouter les filtres actifs
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.payment_method) params.append('payment_method', filters.payment_method);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sales/export/csv?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include', // Envoie le cookie httpOnly
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export CSV:', error);
      alert('Erreur lors de l\'export CSV');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">  {t('sales.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.total} {pagination.total > 1 ? t('dashboard.sales').toLowerCase() : t('sales.sale').toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download size={20} />
            {t('common.export')} CSV
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter size={20} />
            {showFilters ? t('logs.filters') : t('common.filter')}
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filtres */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('logs.filters')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {t('sales.startDate')}
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {t('sales.endDate')}
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Paiement
                </label>
                <select
                  value={filters.payment_method}
                  onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="cash">Espèces</option>
                  <option value="card">Carte</option>
                  <option value="meal_voucher">Ticket resto</option>
                  <option value="mixed">Mixte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="completed">Complétée</option>
                  <option value="cancelled">Annulée</option>
                  <option value="refunded">Remboursée</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Liste des ventes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">  {t('common.loading')}</div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Aucune vente trouvée
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('sales.ticket')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('sales.date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('sales.paymentMethod')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('sales.totalIncl')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('sales.items')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('sales.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {sale.ticket_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {getPaymentMethodLabel(sale.payment_method)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-green-600">
                            {formatPrice(sale.total_ttc)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                          {sale.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => setSelectedSale(sale)}
                              className="text-primary-600 hover:text-primary-800"
                              title={t("sales.saleDetails")}
                            >
                              <Eye size={20} />
                            </button>
                            <button
                              onClick={() => handlePrintTicket(sale.id, sale.ticket_number)}
                              className="text-blue-600 hover:text-blue-800"
                              title={t("sales.reprint")}
                            >
                              <Printer size={20} />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(sale.id, sale.ticket_number)}
                              className="text-green-600 hover:text-green-800"
                              title={t("sales.downloadPDF")}
                            >
                              <Download size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Affichage de {pagination.offset + 1} à{' '}
                  {Math.min(pagination.offset + pagination.limit, pagination.total)} sur{' '}
                  {pagination.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!pagination.has_more}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal détail vente */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">{t('sales.saleDetails')}</h2>
              <p className="text-sm opacity-90">{selectedSale.ticket_number}</p>
            </div>

            <div className="p-6">
              {/* Informations générales */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('sales.information')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('sales.date')}:</span>
                    <p className="font-medium dark:text-gray-100">{formatDate(selectedSale.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('sales.payment')}:</span>
                    <p className="font-medium dark:text-gray-100">
                      {getPaymentMethodLabel(selectedSale.payment_method)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('sales.amountPaid')}:</span>
                    <p className="font-medium dark:text-gray-100">{formatPrice(selectedSale.amount_paid)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('sales.changeGiven')}:</span>
                    <p className="font-medium dark:text-gray-100">{formatPrice(selectedSale.change_given)}</p>
                  </div>
                </div>
              </div>

              {/* Articles */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('sales.items')}</h3>
                <div className="space-y-2">
                  {selectedSale.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{item.product_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatPrice(item.unit_price_ht)} HT × {item.quantity} (TVA {item.vat_rate}%)
                        </p>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        {formatPrice(item.total_ttc)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totaux */}
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.totalExcl')}:</span>
                  <span className="font-medium dark:text-gray-100">{formatPrice(selectedSale.total_ht)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="dark:text-gray-100">{t('sales.totalIncl')}:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatPrice(selectedSale.total_ttc)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedSale(null)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistoryPage;
