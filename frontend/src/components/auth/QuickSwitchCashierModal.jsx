import { useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, UserCircle, X } from 'lucide-react';
import Button from '../ui/Button';

const QuickSwitchCashierModal = ({ isOpen, onClose, onSwitch }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Le nom d\'utilisateur est requis');
      return;
    }

    if (!pin || pin.length !== 4) {
      setError('Le PIN doit contenir 4 chiffres');
      return;
    }

    setLoading(true);

    try {
      await onSwitch(username, pin);
      // Reset form
      setUsername('');
      setPin('');
      setShowPin(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de caissier');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPin('');
    setShowPin(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserCircle className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Changer de caissier</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Saisissez vos identifiants pour prendre le relais sur cette caisse
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Votre nom d'utilisateur"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* PIN */}
          <div className="mb-6">
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              Code PIN (4 chiffres)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                id="pin"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Seulement des chiffres
                  if (value.length <= 4) {
                    setPin(value);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••"
                maxLength={4}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Changement en cours...' : 'Changer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

QuickSwitchCashierModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSwitch: PropTypes.func.isRequired,
};

export default QuickSwitchCashierModal;
