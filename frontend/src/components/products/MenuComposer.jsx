import { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { getAllProducts } from '../../services/productService';

/**
 * Composant pour composer un menu en sélectionnant des produits
 */
const MenuComposer = ({ menuItems = [], onChange, disabled = false }) => {
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const products = await getAllProducts({ include_inactive: false });
      // Exclure les menus de la liste (un menu ne peut pas contenir un autre menu)
      setAvailableProducts(products.filter(p => !p.is_menu));
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem = {
      product_id: availableProducts[0]?.id || '',
      quantity: 1,
    };
    onChange([...menuItems, newItem]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...menuItems];
    updated[index] = {
      ...updated[index],
      [field]: field === 'quantity' ? parseInt(value) : value,
    };
    onChange(updated);
  };

  const removeItem = (index) => {
    onChange(menuItems.filter((_, i) => i !== index));
  };

  const getProductName = (productId) => {
    const product = availableProducts.find(p => p.id === parseInt(productId));
    return product ? product.name : 'Produit inconnu';
  };

  const getProductPrice = (productId) => {
    const product = availableProducts.find(p => p.id === parseInt(productId));
    return product ? parseFloat(product.price_ht) : 0;
  };

  const calculateTotalPrice = () => {
    return menuItems.reduce((total, item) => {
      const price = getProductPrice(item.product_id);
      return total + (price * item.quantity);
    }, 0);
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
        Chargement des produits...
      </div>
    );
  }

  if (availableProducts.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        Aucun produit disponible. Veuillez créer des produits d'abord.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="text-purple-600" size={20} />
          <h4 className="font-semibold text-gray-900">Composition du menu</h4>
        </div>
        {menuItems.length > 0 && (
          <div className="text-sm text-gray-600">
            Prix total composants: <span className="font-semibold">{calculateTotalPrice().toFixed(2)} €</span>
          </div>
        )}
      </div>

      {/* Liste des produits du menu */}
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <div key={index} className="flex gap-2 items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
            {/* Sélecteur produit */}
            <select
              value={item.product_id}
              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Sélectionner un produit</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {parseFloat(product.price_ht).toFixed(2)} € HT
                </option>
              ))}
            </select>

            {/* Quantité */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Qté:</label>
              <input
                type="number"
                min="1"
                max="99"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                disabled={disabled}
                className="w-16 px-2 py-2 border border-purple-300 rounded-lg text-center focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Prix total ligne */}
            <div className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[60px] text-right">
              {(getProductPrice(item.product_id) * item.quantity).toFixed(2)} €
            </div>

            {/* Bouton supprimer */}
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Retirer du menu"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Bouton ajouter produit */}
      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={20} />
        <span className="font-medium">Ajouter un produit au menu</span>
      </button>

      {/* Info pricing */}
      {menuItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-2">💡 Conseil Pricing</h5>
          <p className="text-sm text-blue-700 mb-2">
            Le prix HT que vous définissez pour ce menu devrait être <strong>inférieur</strong> à la somme des produits ({calculateTotalPrice().toFixed(2)} €) pour proposer une réduction attractive.
          </p>
          <p className="text-xs text-blue-600">
            Exemple: Si la somme fait {calculateTotalPrice().toFixed(2)} €, proposez le menu à {(calculateTotalPrice() * 0.85).toFixed(2)} € (-15%) ou {(calculateTotalPrice() * 0.90).toFixed(2)} € (-10%).
          </p>
        </div>
      )}
    </div>
  );
};

export default MenuComposer;
