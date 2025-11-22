import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { useStoreConfig } from '../../context/StoreConfigContext';
import { useLanguage } from '../../context/LanguageContext';
import MenuComposer from './MenuComposer';

const ProductFormModal = ({ isOpen, onClose, onSubmit, product, loading }) => {
  const { config } = useStoreConfig();
  const { t } = useLanguage();

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
    quantity: 0,
    low_stock_threshold: 10,
    menu_items: [],
  });

  // État pour la gestion de l'upload d'image
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        quantity: product.quantity !== undefined ? product.quantity : 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        menu_items: product.menu_composition || product.menu_items || [],
      });
      // Afficher l'image existante
      setImagePreview(product.image_url || null);
      setImageFile(null);
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
        quantity: 0,
        low_stock_threshold: 10,
        menu_items: [],
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [product, isOpen, defaultCategory, defaultVatRate]);

  // Gérer la sélection d'une image
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Vérifier le type de fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert(t('products.invalidImageType') || 'Format invalide. Utilisez JPEG, PNG, WebP ou GIF.');
      return;
    }

    // Vérifier la taille (max 5 MB)
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      alert(t('products.imageTooLarge') || 'L\'image est trop grande (max 5 MB).');
      return;
    }

    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setImageFile(file);
  };

  // Supprimer l'image sélectionnée
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(product?.image_url || null);
    // Reset l'input file
    const fileInput = document.getElementById('product-image-input');
    if (fileInput) fileInput.value = '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Si on coche/décoche "C'est un menu", ajuster automatiquement la catégorie
    if (name === 'is_menu') {
      const menuCategory = categories.find(cat =>
        cat.id === 'menus' || cat.name?.toLowerCase().includes('menu')
      );

      setFormData((prev) => ({
        ...prev,
        is_menu: checked,
        // Si on coche "menu" ET qu'on trouve une catégorie menu, la sélectionner
        category: checked && menuCategory ? menuCategory.id : prev.category,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Soumettre le produit d'abord
    const result = await onSubmit(formData);

    // Si un fichier image est sélectionné et qu'on a un product ID, uploader l'image
    if (imageFile && result?.id) {
      await uploadProductImage(result.id);
    }
  };

  // Upload de l'image produit
  const uploadProductImage = async (productId) => {
    if (!imageFile) return;

    setUploadingImage(true);
    try {
      const formDataImage = new FormData();
      formDataImage.append('image', imageFile);

      // VITE_API_URL contient déjà '/api', donc on ajoute directement le path
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/products/${productId}/image`, {
        method: 'POST',
        credentials: 'include', // Envoie le cookie httpOnly (pas de token localStorage)
        body: formDataImage,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload de l\'image');
      }

      const data = await response.json();
      console.log('Image uploadée avec succès:', data);
    } catch (error) {
      console.error('Erreur upload image:', error);
      alert(t('products.imageUploadError') || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg sticky top-0">
          <h2 className="text-xl font-bold">
            {product ? t('products.editProduct') : t('products.newProductTitle')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.productName')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder={t('products.namePlaceholder')}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder={t('products.descriptionPlaceholder')}
              />
            </div>

            {/* Image produit */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.image') || 'Image du produit'}
              </label>

              {/* Input file */}
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  id="product-image-input"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  disabled={loading || uploadingImage}
                  className="hidden"
                />
                <label
                  htmlFor="product-image-input"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium"
                >
                  {t('products.chooseImage') || 'Choisir une image'}
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 text-sm font-medium"
                  >
                    {t('products.removeImage') || 'Supprimer'}
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('products.imageFormatHelp') || 'Formats acceptés: JPEG, PNG, WebP, GIF (max 5 MB)'}
              </p>

              {/* Preview */}
              {imagePreview && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('products.preview') || 'Aperçu'}
                  </p>
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt={t('products.preview') || 'Aperçu'}
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect fill="%23ddd" width="128" height="128"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EErreur%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {imageFile && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {t('products.newImage') || 'Nouveau'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prix HT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.priceHT')} (€) *
              </label>
              <input
                type="number"
                name="price_ht"
                value={formData.price_ht}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder={t('products.pricePlaceholder')}
              />
            </div>

            {/* TVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.vatRate')} *
              </label>
              <select
                name="vat_rate"
                value={formData.vat_rate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.category')} *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.displayOrder')}
              </label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Quantité en stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.quantity')}
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder={t('products.stockPlaceholder')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('products.stockHelp')}
              </p>
            </div>

            {/* Seuil d'alerte stock bas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('products.lowStockThreshold')}
              </label>
              <input
                type="number"
                name="low_stock_threshold"
                value={formData.low_stock_threshold}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder={t('products.lowStockThresholdPlaceholder')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('products.lowStockAlertHelp')}
              </p>
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('products.productActive')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_menu"
                  checked={formData.is_menu}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('products.isMenu')}</span>
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
          <div className="flex gap-3 mt-6 pt-6 border-t dark:border-gray-600">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('products.saving') : product ? t('products.modify') : t('products.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
