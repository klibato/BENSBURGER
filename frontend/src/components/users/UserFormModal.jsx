import { useState, useEffect } from 'react';
import Button from '../ui/Button';

const ROLES = [
  { value: 'cashier', label: 'Caissier' },
  { value: 'admin', label: 'Administrateur' },
];

const UserFormModal = ({ isOpen, onClose, onSubmit, user, loading }) => {
  const [formData, setFormData] = useState({
    username: '',
    pin_code: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'cashier',
    is_active: true,
  });

  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        pin_code: '', // Ne pas pré-remplir le PIN pour la sécurité
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || 'cashier',
        is_active: user.is_active !== undefined ? user.is_active : true,
      });
    } else {
      setFormData({
        username: '',
        pin_code: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'cashier',
        is_active: true,
      });
    }
    setPinError('');
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'pin_code') {
      // Ne permettre que les chiffres et limiter à 4 caractères
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));

      // Valider le PIN
      if (numericValue.length > 0 && numericValue.length < 4) {
        setPinError('Le code PIN doit contenir 4 chiffres');
      } else {
        setPinError('');
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation du PIN pour création
    if (!user && formData.pin_code.length !== 4) {
      setPinError('Le code PIN doit contenir exactement 4 chiffres');
      return;
    }

    // Validation du PIN pour modification (si fourni)
    if (user && formData.pin_code && formData.pin_code.length !== 4) {
      setPinError('Le code PIN doit contenir exactement 4 chiffres');
      return;
    }

    // Ne pas envoyer le PIN vide en modification
    const dataToSubmit = { ...formData };
    if (user && !formData.pin_code) {
      delete dataToSubmit.pin_code;
    }

    onSubmit(dataToSubmit);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg sticky top-0">
          <h2 className="text-xl font-bold">
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom d'utilisateur */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nom d'utilisateur *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: jdupont"
              />
            </div>

            {/* Code PIN */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Code PIN (4 chiffres) {user ? '' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  name="pin_code"
                  value={formData.pin_code}
                  onChange={handleChange}
                  required={!user}
                  pattern="\d{4}"
                  maxLength="4"
                  className={`w-full px-4 py-2 border ${pinError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500`}
                  placeholder={user ? 'Laisser vide pour ne pas changer' : '1234'}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPin ? '🙈' : '👁️'}
                </button>
              </div>
              {pinError && (
                <p className="text-red-500 text-sm mt-1">{pinError}</p>
              )}
              {user && !formData.pin_code && (
                <p className="text-gray-500 text-sm mt-1">Laissez vide pour conserver le PIN actuel</p>
              )}
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Jean"
              />
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nom *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Dupont"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="jean.dupont@example.com"
              />
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Rôle *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut actif */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Utilisateur actif</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !!pinError}
              className="flex-1"
            >
              {loading ? 'Enregistrement...' : user ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
