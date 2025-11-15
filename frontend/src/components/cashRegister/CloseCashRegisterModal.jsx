import { useState, useEffect } from 'react';
import { closeCashRegister } from '../../services/cashRegisterService';
import { useCashRegister } from '../../context/CashRegisterContext';

const CloseCashRegisterModal = ({ isOpen, onClose, cashRegister }) => {
  const { closeRegister } = useCashRegister();
  const [countedCash, setCountedCash] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculer l'attendu théorique
  const expectedBalance = cashRegister
    ? parseFloat(cashRegister.opening_balance) + parseFloat(cashRegister.total_cash_collected || 0)
    : 0;

  // Calculer la différence
  const difference = countedCash ? parseFloat(countedCash) - expectedBalance : 0;

  useEffect(() => {
    if (isOpen) {
      // Pré-remplir avec le théorique
      setCountedCash(expectedBalance.toFixed(2));
      setClosingBalance(expectedBalance.toFixed(2));
      setNotes('');
      setError(null);
    }
  }, [isOpen, expectedBalance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await closeCashRegister(cashRegister.id, {
        counted_cash: parseFloat(countedCash),
        closing_balance: parseFloat(closingBalance),
        notes: notes || undefined,
      });

      // Mettre à jour le contexte
      closeRegister();

      // Fermer le modal
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de la fermeture de la caisse');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cashRegister) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg sticky top-0">
          <h2 className="text-xl font-bold">Clôture de caisse</h2>
          <p className="text-sm opacity-90 mt-1">{cashRegister.register_name}</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Récapitulatif */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Récapitulatif</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fond de caisse:</span>
                <span className="font-medium">{parseFloat(cashRegister.opening_balance).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Espèces encaissées:</span>
                <span className="font-medium">{parseFloat(cashRegister.total_cash_collected || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">Attendu théorique:</span>
                <span className="font-bold text-lg">{expectedBalance.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Nombre de ventes:</span>
                <span className="font-medium">{cashRegister.ticket_count || 0}</span>
              </div>
            </div>
          </div>

          {/* Montant compté */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Montant compté (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-semibold"
              required
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              Espèces réellement comptées en caisse
            </p>
          </div>

          {/* Différence */}
          {countedCash && (
            <div className={`mb-4 p-4 rounded-lg ${
              difference === 0 ? 'bg-green-50 border border-green-200' :
              difference > 0 ? 'bg-blue-50 border border-blue-200' :
              'bg-orange-50 border border-orange-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Différence:</span>
                <span className={`text-xl font-bold ${
                  difference === 0 ? 'text-green-700' :
                  difference > 0 ? 'text-blue-700' :
                  'text-orange-700'
                }`}>
                  {difference > 0 ? '+' : ''}{difference.toFixed(2)} €
                </span>
              </div>
              {difference !== 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {difference > 0 ? 'Excédent' : 'Manquant'}
                </p>
              )}
            </div>
          )}

          {/* Solde de fermeture */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Solde de fermeture (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
              required
              placeholder="0.00"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows="3"
              placeholder="Remarques sur la clôture..."
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
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Fermeture...' : 'Fermer la caisse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseCashRegisterModal;
