import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import CashPayment from './CashPayment';
import { prepareSaleItems } from '../../utils/saleHelper';
import { createSale } from '../../services/saleService';
import { Banknote, CreditCard, Ticket, Shuffle } from 'lucide-react';
import { useStoreConfig } from '../../context/StoreConfigContext';

/**
 * Modal de paiement
 * Gère le processus complet de paiement avec choix du mode
 * Les moyens de paiement sont chargés dynamiquement depuis la configuration
 */
const PaymentModal = ({ isOpen, onClose, cart, onSuccess }) => {
  const { config, isPaymentMethodEnabled } = useStoreConfig();

  // Construire la liste des méthodes de paiement avec les icônes
  const PAYMENT_METHODS_CONFIG = useMemo(() => {
    const iconMap = {
      cash: Banknote,
      card: CreditCard,
      meal_voucher: Ticket,
      mixed: Shuffle,
    };

    const colorMap = {
      cash: 'bg-green-500',
      card: 'bg-blue-500',
      meal_voucher: 'bg-orange-500',
      mixed: 'bg-purple-500',
    };

    // Construire la liste à partir de la config
    const methods = [];
    const paymentMethods = config.payment_methods || {};

    Object.keys(paymentMethods).forEach((methodId) => {
      const method = paymentMethods[methodId];
      if (method.enabled) {
        methods.push({
          id: methodId,
          label: method.name,
          icon: iconMap[methodId] || Banknote,
          color: colorMap[methodId] || 'bg-gray-500',
        });
      }
    });

    // Si aucune méthode configurée, utiliser les valeurs par défaut
    if (methods.length === 0) {
      return [
        { id: 'cash', label: 'Espèces', icon: Banknote, color: 'bg-green-500' },
        { id: 'card', label: 'Carte Bancaire', icon: CreditCard, color: 'bg-blue-500' },
        { id: 'meal_voucher', label: 'Titres Restaurant', icon: Ticket, color: 'bg-orange-500' },
        { id: 'mixed', label: 'Paiement Mixte', icon: Shuffle, color: 'bg-purple-500' },
      ];
    }

    return methods;
  }, [config.payment_methods]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculer le total
  const totalTTC = cart.reduce(
    (sum, item) => sum + parseFloat(item.price_ttc) * item.quantity,
    0
  );

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    setError(null);
  };

  const handleBack = () => {
    setSelectedMethod(null);
    setError(null);
  };

  const handlePayment = async (paymentData) => {
    setLoading(true);
    setError(null);

    try {
      // Préparer les items pour l'API
      const items = prepareSaleItems(cart);

      // Créer la vente
      const saleData = {
        items,
        payment_method: paymentData.payment_method,
        amount_paid: paymentData.amount_paid,
        payment_details: paymentData.payment_details || null,
      };

      const response = await createSale(saleData);

      // Succès
      if (response.success) {
        onSuccess(response.data);
        onClose();
        setSelectedMethod(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message || 'Erreur lors du paiement'
      );
      console.error('Erreur paiement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = () => {
    handlePayment({
      payment_method: 'card',
      amount_paid: totalTTC,
    });
  };

  const handleMealVoucherPayment = () => {
    handlePayment({
      payment_method: 'meal_voucher',
      amount_paid: totalTTC,
    });
  };

  const renderPaymentMethod = () => {
    if (selectedMethod === 'cash') {
      return (
        <CashPayment
          totalTTC={totalTTC}
          onConfirm={handlePayment}
          onCancel={handleBack}
        />
      );
    }

    if (selectedMethod === 'card') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
            <CreditCard size={64} className="mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Paiement par Carte</h3>
            <p className="text-3xl font-bold text-blue-600 mb-4">
              {totalTTC.toFixed(2)} €
            </p>
            <p className="text-gray-600 mb-4">
              Présentez la carte au terminal de paiement
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleBack} className="flex-1">
              Retour
            </Button>
            <Button
              variant="primary"
              onClick={handleCardPayment}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Traitement...' : 'Confirmer le paiement'}
            </Button>
          </div>
        </div>
      );
    }

    if (selectedMethod === 'meal_voucher') {
      return (
        <div className="space-y-4">
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-center">
            <Ticket size={64} className="mx-auto mb-4 text-orange-500" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Titres Restaurant</h3>
            <p className="text-3xl font-bold text-orange-600 mb-4">
              {totalTTC.toFixed(2)} €
            </p>
            <p className="text-gray-600 mb-2">
              Scannez ou saisissez le(s) titre(s) restaurant
            </p>
            <p className="text-sm text-orange-600">
              ⚠️ Plafond journalier: 25€ par titre
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleBack} className="flex-1">
              Retour
            </Button>
            <Button
              variant="primary"
              onClick={handleMealVoucherPayment}
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Traitement...' : 'Confirmer le paiement'}
            </Button>
          </div>
        </div>
      );
    }

    if (selectedMethod === 'mixed') {
      return <MixedPayment totalTTC={totalTTC} onConfirm={handlePayment} onCancel={handleBack} loading={loading} />;
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💳 Encaissement"
      size="lg"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading && !selectedMethod ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Traitement du paiement...</p>
        </div>
      ) : selectedMethod ? (
        renderPaymentMethod()
      ) : (
        <div className="space-y-6">
          {/* Total */}
          <div className="bg-primary-50 rounded-lg p-6 text-center">
            <p className="text-gray-600 text-lg mb-2">Montant à payer</p>
            <p className="text-4xl font-bold text-primary-600">
              {totalTTC.toFixed(2)} €
            </p>
          </div>

          {/* Modes de paiement */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Sélectionnez le mode de paiement
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {PAYMENT_METHODS_CONFIG.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className={`${method.color} hover:opacity-90 text-white rounded-lg p-6 text-center transition-all transform hover:scale-105 active:scale-95 shadow-lg`}
                  >
                    <Icon size={48} className="mx-auto mb-3" />
                    <span className="font-semibold text-lg">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bouton annuler */}
          <Button variant="secondary" onClick={onClose} className="w-full">
            Annuler
          </Button>
        </div>
      )}
    </Modal>
  );
};

/**
 * Composant de paiement mixte
 */
const MixedPayment = ({ totalTTC, onConfirm, onCancel, loading }) => {
  const [payments, setPayments] = useState([
    { method: 'cash', amount: '' },
  ]);

  const totalPaid = payments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );
  const remaining = totalTTC - totalPaid;

  const addPayment = () => {
    setPayments([...payments, { method: 'cash', amount: '' }]);
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index, field, value) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleSubmit = () => {
    if (remaining > 0.01) {
      alert('Le montant total payé est insuffisant');
      return;
    }

    onConfirm({
      payment_method: 'mixed',
      amount_paid: totalPaid,
      payment_details: {
        payments: payments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
        })),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700">Total à payer:</span>
          <span className="text-2xl font-bold text-purple-600">
            {totalTTC.toFixed(2)} €
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Déjà payé:</span>
          <span className="text-xl font-semibold text-gray-800">
            {totalPaid.toFixed(2)} €
          </span>
        </div>
        <div className="border-t border-purple-200 mt-2 pt-2 flex justify-between items-center">
          <span className="text-gray-700">Reste à payer:</span>
          <span
            className={`text-2xl font-bold ${
              remaining > 0 ? 'text-orange-600' : 'text-green-600'
            }`}
          >
            {remaining.toFixed(2)} €
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {payments.map((payment, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={payment.method}
              onChange={(e) => updatePayment(index, 'method', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
              <option value="meal_voucher">Titres Restaurant</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={payment.amount}
              onChange={(e) => updatePayment(index, 'amount', e.target.value)}
              placeholder="Montant"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            {payments.length > 1 && (
              <button
                onClick={() => removePayment(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        onClick={addPayment}
        className="w-full"
      >
        + Ajouter un mode de paiement
      </Button>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Retour
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || remaining > 0.01}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          {loading ? 'Traitement...' : 'Confirmer le paiement'}
        </Button>
      </div>
    </div>
  );
};

export default PaymentModal;
