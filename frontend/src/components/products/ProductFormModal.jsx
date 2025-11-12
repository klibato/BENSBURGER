import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { useStoreConfig } from '../../context/StoreConfigContext';
import MenuComposer from './MenuComposer';

const ProductFormModal = ({ isOpen, onClose, onSubmit, product, loading }) => {
  const { config } = useStoreConfig();

  // Utiliser les catégories et taux de TVA de la configuration
  const categories = config.categories || [];
  const vatRates = config.vat_rates || [];

  // Valeurs par défaut intelligentes
  const defaultCategory = categories.length > 0 ? categories[0].id : 'burgers';
  const defaultVatRate = vatRates.length > 0 ? vatRates[0].rate : 10;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_ht: '',
    vat_rate: defaultVatRate,
    category: defaultCategory,
    image_url: '',
    is_active: true,
    is_menu: false,
    display_order: 0,
    menu_items: [],
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price_ht: product.price_ht || '',
        vat_rate: product.vat_rate || defaultVatRate,
        category: product.category || defaultCategory,
        image_url: product.image_url || '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        is_menu: product.is_menu || false,
        display_order: product.display_order || 0,
        menu_items: product.menu_composition || product.menu_items || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price_ht: '',
        vat_rate: defaultVatRate,
        category: defaultCategory,
        image_url: '',
        is_active: true,
        is_menu: false,
        display_order: 0,
        menu_items: [],
      });
    }
  }, [product, isOpen, defaultCategory, defaultVatRate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg sticky top-0">
          <h2 className="text-xl font-bold">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du produit *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Burger Classic"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Description du produit..."
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de l'image (optionnel)
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="https://exemple.com/image.jpg"
              />
              {formData.image_url && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Prévisualisation :</p>
                  <img
                    src={formData.image_url}
                    alt="Prévisualisation"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                    onError={(e) => {
                      e.target.src = '';
                      e.target.alt = 'Image non disponible';
                      e.target.className = 'w-32 h-32 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200 text-gray-400 text-sm';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Prix HT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix HT (€) *
              </label>
              <input
                type="number"
                name="price_ht"
                value={formData.price_ht}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>

            {/* TVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux TVA *
              </label>
              <select
                name="vat_rate"
                value={formData.vat_rate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {vatRates.length > 0 ? (
                  vatRates.map((vat) => (
                    <option key={vat.rate} value={vat.rate}>
                      {vat.name} - {vat.description}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={5.5}>TVA 5.5%</option>
                    <option value={10}>TVA 10%</option>
                    <option value={20}>TVA 20%</option>
                  </>
                )}
              </select>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="burgers">Burgers</option>
                    <option value="sides">Accompagnements</option>
                    <option value="drinks">Boissons</option>
                    <option value="desserts">Desserts</option>
                    <option value="menus">Menus</option>
                  </>
                )}
              </select>
            </div>

            {/* Ordre d'affichage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordre d'affichage
              </label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Checkboxes */}
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Produit actif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_menu"
                  checked={formData.is_menu}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">C'est un menu</span>
              </label>
            </div>

            {/* Menu Composition */}
            {formData.is_menu && (
              <div className="md:col-span-2 mt-4">
                <MenuComposer
                  menuItems={formData.menu_items}
                  onChange={(items) => setFormData(prev => ({ ...prev, menu_items: items }))}
                  disabled={loading}
                />
              </div>
            )}
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
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Enregistrement...' : product ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
