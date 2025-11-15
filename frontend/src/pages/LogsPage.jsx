import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLogs, exportLogsCSV } from '../services/logsService';
import { getAllUsers } from '../services/userService';
import { Download, RefreshCw, Filter, X } from 'lucide-react';

const LogsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    has_more: false,
  });

  // Filtres
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    user_id: '',
    action: '',
    entity_type: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState([]);

  // Charger la liste des utilisateurs pour le filtre
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        setUsers(response.data.users || []);
      } catch (err) {
        console.error('Erreur lors du chargement des utilisateurs:', err);
      }
    };
    fetchUsers();
  }, []);

  // Charger les logs
  const fetchLogs = async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        limit: pagination.limit,
        offset,
      };

      // Nettoyer les paramètres vides
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await getLogs(params);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchLogs(0);
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      user_id: '',
      action: '',
      entity_type: '',
    });
    // Recharger sans filtres
    setTimeout(() => fetchLogs(0), 100);
  };

  const handleExportCSV = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      await exportLogsCSV(params);
    } catch (err) {
      alert('Erreur lors de l\'export CSV');
    }
  };

  const handlePreviousPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchLogs(newOffset);
  };

  const handleNextPage = () => {
    const newOffset = pagination.offset + pagination.limit;
    fetchLogs(newOffset);
  };

  // Types d'actions disponibles
  const actionTypes = [
    'LOGIN',
    'LOGOUT',
    'SWITCH_CASHIER',
    'SALE',
    'OPEN_REGISTER',
    'CLOSE_REGISTER',
    'CREATE',
    'UPDATE',
    'DELETE',
  ];

  // Types d'entités disponibles
  const entityTypes = [
    'user',
    'product',
    'sale',
    'cash_register',
    'menu_composition',
  ];

  // Formatage de la date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Badge de couleur selon l'action
  const getActionBadgeColor = (action) => {
    const colors = {
      LOGIN: 'bg-green-100 text-green-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      SWITCH_CASHIER: 'bg-blue-100 text-blue-800',
      SALE: 'bg-purple-100 text-purple-800',
      OPEN_REGISTER: 'bg-teal-100 text-teal-800',
      CLOSE_REGISTER: 'bg-orange-100 text-orange-800',
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Accès réservé aux administrateurs
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Logs & Audit</h1>
          <p className="text-gray-600 mt-1">Journal de toutes les actions du système</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtres
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={() => fetchLogs(0)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date début
              </label>
              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date fin
              </label>
              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utilisateur
              </label>
              <select
                name="user_id"
                value={filters.user_id}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les utilisateurs</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les actions</option>
                {actionTypes.map(action => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'entité
              </label>
              <select
                name="entity_type"
                value={filters.entity_type}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les types</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Appliquer les filtres
            </button>
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tableau des logs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-4">Chargement des logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucun log trouvé</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.user.first_name} {log.user.last_name}
                          </div>
                          <div className="text-gray-500 text-xs">
                            @{log.user.username} · {log.user.role}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Système</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.entity_type || '-'}
                      {log.entity_id && (
                        <span className="text-gray-500 ml-1">#{log.entity_id}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Affichage de {pagination.offset + 1} à{' '}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} sur{' '}
                {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.has_more}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
