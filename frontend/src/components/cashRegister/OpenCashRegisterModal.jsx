import { useState } from 'react';
import { openCashRegister } from '../../services/cashRegisterService';
import { useCashRegister } from '../../context/CashRegisterContext';

const OpenCashRegisterModal = ({ isOpen, onClose }) => {
  const { openRegister } = useCashRegister();
  const [registerName, setRegisterName] = useState('Caisse Principale');
  const [openingBalance, setOpeningBalance] = useState('100.00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await openCashRegister({
        register_name: registerName,
        opening_balance: parseFloat(openingBalance),
        notes: notes || undefined,
      });

      // Mettre à jour le contexte
      openRegister(response.data);

      // Fermer le modal
      onClose();

      // Réinitialiser le formulaire
      setRegisterName('Caisse Principale');
      setOpeningBalance('100.00');
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de l\'ouverture de la caisse');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">Ouvrir une caisse</h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Nom de la caisse */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Nom de la caisse *
            </label>
            <input
              type="text"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              required
              placeholder="Ex: Caisse Principale"
            />
          </div>

          {/* Fond de caisse */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Fond de caisse (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              required
              placeholder="100.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              Montant en espèces présent au démarrage
            </p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows="3"
              placeholder="Remarques..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Ouverture...' : 'Ouvrir la caisse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpenCashRegisterModal;
