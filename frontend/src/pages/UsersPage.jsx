import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users as UsersIcon, Edit2, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import UserFormModal from '../components/users/UserFormModal';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../services/userService';

const ROLES_LABELS = {
  admin: 'Administrateur',
  cashier: 'Caissier',
};

const UsersPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await getAllUsers({ include_inactive: true });
      setUsers(users || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter((u) => u.is_active);
    }

    setFilteredUsers(filtered);
  }, [users, showInactive]);

  // Handle create user
  const handleCreateUser = async (formData) => {
    try {
      setModalLoading(true);
      setError(null);
      await createUser(formData);
      setSuccessMessage('Utilisateur créé avec succès');
      setIsModalOpen(false);
      setEditingUser(null);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async (formData) => {
    try {
      setModalLoading(true);
      setError(null);
      await updateUser(editingUser.id, formData);
      setSuccessMessage('Utilisateur modifié avec succès');
      setIsModalOpen(false);
      setEditingUser(null);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors de la modification de l\'utilisateur');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    try {
      setError(null);
      await deleteUser(userId);
      setSuccessMessage('Utilisateur désactivé avec succès');
      setDeleteConfirm(null);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors de la suppression de l\'utilisateur');
    }
  };

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
              <UsersIcon size={28} />
              Gestion des Utilisateurs
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
          >
            + Nouvel Utilisateur
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="showInactive" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Afficher inactifs
            </label>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Chargement des utilisateurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">  {t('users.noUsers')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom complet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {ROLES_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:text-gray-100">
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!user.is_active}
                            title="Désactiver"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        user={editingUser}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Confirmer la désactivation
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Êtes-vous sûr de vouloir désactiver l'utilisateur{' '}
                <span className="font-semibold">
                  {deleteConfirm.first_name} {deleteConfirm.last_name}
                </span>{' '}
                ? L'utilisateur ne pourra plus se connecter.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDeleteUser(deleteConfirm.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Désactiver
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
