import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrganizationById,
  suspendOrganization,
  activateOrganization,
  getOrganizationUsers,
  updateOrganizationSubscription,
  changeUserPassword,
} from '../utils/api';
import {
  Building2,
  Users,
  Package,
  ArrowLeft,
  Loader,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  PlayCircle,
  CreditCard,
  Key,
  Edit,
} from 'lucide-react';

function OrganizationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Data states
  const [users, setUsers] = useState([]);

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPinCode, setNewPinCode] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({ plan: '', billing_interval: '' });

  useEffect(() => {
    loadOrganization();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      loadUsers();
    }
  }, [activeTab]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getOrganizationById(id);

      if (response.success) {
        setOrganization(response.data.organization);
      } else {
        setError(response.error?.message || 'Organisation introuvable');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getOrganizationUsers(id);
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error('Erreur chargement users:', err);
    }
  };

  const handleSuspend = async () => {
    if (!confirm('Êtes-vous sûr de vouloir suspendre cette organisation ?')) {
      return;
    }

    const reason = prompt('Raison de la suspension:');
    if (!reason) return;

    try {
      setActionLoading(true);
      const response = await suspendOrganization(id, reason);
      if (response.success) {
        alert('Organisation suspendue avec succès');
        loadOrganization();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erreur lors de la suspension');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm('Êtes-vous sûr de vouloir activer cette organisation ?')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await activateOrganization(id);
      if (response.success) {
        alert('Organisation activée avec succès');
        loadOrganization();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || "Erreur lors de l'activation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const response = await changeUserPassword(selectedUser.id, newPinCode);
      if (response.success) {
        alert('Mot de passe modifié avec succès');
        setShowPasswordModal(false);
        setSelectedUser(null);
        setNewPinCode('');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erreur lors du changement de mot de passe');
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();

    try {
      const response = await updateOrganizationSubscription(id, subscriptionForm);
      if (response.success) {
        alert('Abonnement mis à jour avec succès');
        setShowSubscriptionModal(false);
        loadOrganization();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || "Erreur lors de la mise à jour de l'abonnement");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button
          onClick={() => navigate('/organizations')}
          className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erreur</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif', icon: CheckCircle },
      suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspendu', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Annulé', icon: XCircle },
    };

    const badge = badges[status] || badges.active;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getInvoiceStatusBadge = (status) => {
    const badges = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Payée', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente', icon: Clock },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Échouée', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Annulée', icon: XCircle },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const formatAmount = (cents) => {
    return (cents / 100).toFixed(2) + ' €';
  };

  const tabs = [
    { id: 'info', label: 'Informations', icon: Building2 },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
  ];

  return (
    <div>
      <button
        onClick={() => navigate('/organizations')}
        className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux organisations
      </button>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-gray-600 mt-1">{organization.slug}</p>
            </div>
          </div>
          <div>{getStatusBadge(organization.status)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-3">
        {organization.status === 'active' ? (
          <button
            onClick={handleSuspend}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            Suspendre
          </button>
        ) : (
          <button
            onClick={handleActivate}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            Activer
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Utilisateurs</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{organization.stats?.users || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Maximum: {organization.max_users}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold">Produits</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{organization.stats?.products || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Maximum: {organization.max_products}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-orange-600" />
            <h3 className="text-lg font-semibold">Plan</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 capitalize">{organization.plan}</p>
          <p className="text-sm text-gray-500 mt-1">
            {organization.trial_ends_at && new Date(organization.trial_ends_at) > new Date()
              ? `Essai jusqu'au ${new Date(organization.trial_ends_at).toLocaleDateString('fr-FR')}`
              : 'Plan actif'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900 font-medium">{organization.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="text-gray-900 font-medium">{organization.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Créée le</p>
                <p className="text-gray-900 font-medium">
                  {new Date(organization.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dernière modification</p>
                <p className="text-gray-900 font-medium">
                  {new Date(organization.updated_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader className="w-8 h-8 mx-auto mb-3 animate-spin" />
                  <p>Chargement des utilisateurs...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Utilisateur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Rôle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.username}</div>
                              <div className="text-sm text-gray-500">
                                {user.first_name} {user.last_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm text-red-600">
                                <XCircle className="w-4 h-4" />
                                Inactif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordModal(true);
                              }}
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900"
                            >
                              <Key className="w-4 h-4" />
                              Changer PIN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan actuel</h3>
                <p className="text-2xl font-bold text-blue-600 capitalize mb-2">{organization.plan}</p>
                <p className="text-sm text-gray-600">
                  {organization.trial_ends_at && new Date(organization.trial_ends_at) > new Date()
                    ? `Période d'essai jusqu'au ${new Date(organization.trial_ends_at).toLocaleDateString('fr-FR')}`
                    : 'Abonnement actif'}
                </p>
              </div>

              <button
                onClick={() => {
                  setSubscriptionForm({ plan: organization.plan, billing_interval: 'monthly' });
                  setShowSubscriptionModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Edit className="w-4 h-4" />
                Modifier l'abonnement
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Changer le code PIN - {selectedUser.username}
            </h2>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau code PIN (4-6 chiffres)
                </label>
                <input
                  type="text"
                  value={newPinCode}
                  onChange={(e) => setNewPinCode(e.target.value)}
                  pattern="[0-9]{4,6}"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Entrez le nouveau PIN"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUser(null);
                    setNewPinCode('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Modifier l'abonnement</h2>
            <form onSubmit={handleUpdateSubscription}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                <select
                  value={subscriptionForm.plan}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, plan: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un plan</option>
                  <option value="starter">Starter (29€)</option>
                  <option value="pro">Pro (89€)</option>
                  <option value="business">Business (199€)</option>
                  <option value="enterprise">Enterprise (Sur devis)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de facturation
                </label>
                <select
                  value={subscriptionForm.billing_interval}
                  onChange={(e) =>
                    setSubscriptionForm({ ...subscriptionForm, billing_interval: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner une période</option>
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationDetailsPage;
