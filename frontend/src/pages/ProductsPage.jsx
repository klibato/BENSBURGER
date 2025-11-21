import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, Download, Edit2, Trash2, ArrowLeft, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import ProductFormModal from '../components/products/ProductFormModal';
import { useStoreConfig } from '../context/StoreConfigContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductsOrder,
} from '../services/productService';
import api from '../services/api';

const ProductsPage = () => {
  const navigate = useNavigate();
  const { config } = useStoreConfig();
  const { t } = useLanguage();

  // Construire la liste des catégories dynamiquement depuis la config
  const CATEGORIES = useMemo(() => {
    const cats = [{ value: '', label: t('products.allCategories') }];

    if (config.categories && config.categories.length > 0) {
      config.categories.forEach((cat) => {
        cats.push({
          value: cat.id,
          label: `${cat.icon} ${cat.name}`,
        });
      });
    } else {
      // Fallback si pas de catégories configurées
      cats.push(
        { value: 'burgers', label: 'Burgers' },
        { value: 'sides', label: 'Accompagnements' },
        { value: 'drinks', label: 'Boissons' },
        { value: 'desserts', label: 'Desserts' },
        { value: 'menus', label: 'Menus' }
      );
    }

    return cats;
  }, [config.categories, t]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const products = await getAllProducts({ include_inactive: true });
      setProducts(products || []);
    } catch (err) {
      console.error('Erreur lors du chargement des produits:', err);
      setError('Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Export products to CSV
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/products/export/csv', {
        params: {
          category: selectedCategory || undefined,
          include_inactive: showInactive,
        },
        responseType: 'blob', // Important pour télécharger le fichier
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `produits_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccessMessage(t('messages.updateSuccess'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'export CSV:', err);
      setError(t('messages.updateError'));
      setTimeout(() => setError(null), 5000);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter((p) => p.is_active);
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, showInactive]);

  // Handle create product
  const handleCreateProduct = async (formData) => {
    try {
      setModalLoading(true);
      setError(null);

      console.log('Données envoyées au backend:', formData);

      const result = await createProduct(formData);
      setSuccessMessage(t('products.created'));
      setIsModalOpen(false);
      setEditingProduct(null);

      // Attendre que l'upload de l'image se termine avant de recharger
      setTimeout(async () => {
        await fetchProducts();
      }, 2000);

      setTimeout(() => setSuccessMessage(''), 3000);

      // Retourner le produit créé pour que ProductFormModal puisse uploader l'image
      return result.data;
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      console.error('Détails erreur:', err.response?.data);

      const errorMessage = err.response?.data?.error?.message
        || err.response?.data?.message
        || t('messages.createError');

      setError(errorMessage);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle update product
  const handleUpdateProduct = async (formData) => {
    try {
      setModalLoading(true);
      setError(null);
      const result = await updateProduct(editingProduct.id, formData);
      setSuccessMessage(t('products.updated'));
      setIsModalOpen(false);
      setEditingProduct(null);

      // Attendre que l'upload de l'image se termine avant de recharger
      setTimeout(async () => {
        await fetchProducts();
      }, 2000);

      setTimeout(() => setSuccessMessage(''), 3000);

      // Retourner le produit pour l'upload d'image
      return { id: editingProduct.id, ...result?.data };
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      setError(err.response?.data?.message || t('messages.updateError'));
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (productId) => {
    try {
      setError(null);
      await deleteProduct(productId);
      setSuccessMessage(t('products.deleted'));
      setDeleteConfirm(null);
      await fetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || t('messages.deleteError'));
    }
  };

  // Calculate price TTC
  const calculatePriceTTC = (priceHT, vatRate) => {
    return (parseFloat(priceHT) * (1 + parseFloat(vatRate) / 100)).toFixed(2);
  };

  // Get category label
  const getCategoryLabel = (value) => {
    const cat = CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  // Move product up or down in display order
  const handleMoveProduct = async (index, direction) => {
    try {
      const newProducts = [...filteredProducts];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      // Check bounds
      if (targetIndex < 0 || targetIndex >= newProducts.length) {
        return;
      }

      // Swap display_order values
      const temp = newProducts[index].display_order;
      newProducts[index].display_order = newProducts[targetIndex].display_order;
      newProducts[targetIndex].display_order = temp;

      // Swap positions in array
      [newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]];

      // Update state optimistically
      setFilteredProducts(newProducts);

      // Send update to backend
      const updates = [
        { id: newProducts[index].id, display_order: newProducts[index].display_order },
        { id: newProducts[targetIndex].id, display_order: newProducts[targetIndex].display_order },
      ];

      await updateProductsOrder(updates);
      setSuccessMessage(t('messages.updateSuccess'));
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Erreur lors de la réorganisation:', err);
      setError(t('messages.updateError'));
      // Reload products to restore correct order
      await fetchProducts();
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
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Package size={28} />
              {t('products.title')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {filteredProducts.length} {filteredProducts.length > 1 ? t('products.products') : t('products.product')}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download size={20} />
            {t('products.exportCSV')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
          >
            {t('products.newProduct')}
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Show inactive toggle */}
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="showInactive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.showInactive')}
              </label>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('products.loading')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('products.noProducts')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.product')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.category')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.price')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.stock')}
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.status')}
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.order')}
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('products.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                      {product.is_menu && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                          {t('products.menu')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {getCategoryLabel(product.category)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {calculatePriceTTC(product.price_ht, product.vat_rate)} €
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        HT: {parseFloat(product.price_ht).toFixed(2)} € • TVA {product.vat_rate}%
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {product.is_menu ? (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      ) : product.is_out_of_stock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⚠️ {t('products.outOfStock')}
                        </span>
                      ) : product.is_low_stock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          ⚡ {product.quantity}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-green-600">
                          ✓ {product.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {product.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t('products.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {t('products.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-center">{product.display_order}</span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveProduct(filteredProducts.indexOf(product), 'up')}
                            disabled={filteredProducts.indexOf(product) === 0}
                            className="p-0.5 text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={t('products.moveUp')}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveProduct(filteredProducts.indexOf(product), 'down')}
                            disabled={filteredProducts.indexOf(product) === filteredProducts.length - 1}
                            className="p-0.5 text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={t('products.moveDown')}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('common.delete')}
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
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        product={editingProduct}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('products.confirmDelete')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('messages.confirmDelete')} {' '}
                <span className="font-semibold">{deleteConfirm.name}</span> ?
                {t('messages.confirmDeleteDesc')}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDeleteProduct(deleteConfirm.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
