import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import ProductFormModal from '../components/products/ProductFormModal';
import { useStoreConfig } from '../context/StoreConfigContext';
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

  // Construire la liste des catégories dynamiquement depuis la config
  const CATEGORIES = useMemo(() => {
    const cats = [{ value: '', label: 'Toutes les catégories' }];

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
  }, [config.categories]);
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

      setSuccessMessage('Export CSV réussi !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'export CSV:', err);
      setError('Impossible d\'exporter les produits en CSV');
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

      await createProduct(formData);
      setSuccessMessage('Produit créé avec succès');
      setIsModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      console.error('Détails erreur:', err.response?.data);

      const errorMessage = err.response?.data?.error?.message
        || err.response?.data?.message
        || 'Erreur lors de la création du produit';

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
      await updateProduct(editingProduct.id, formData);
      setSuccessMessage('Produit modifié avec succès');
      setIsModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      setError(err.response?.data?.message || 'Erreur lors de la modification du produit');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (productId) => {
    try {
      setError(null);
      await deleteProduct(productId);
      setSuccessMessage('Produit supprimé avec succès');
      setDeleteConfirm(null);
      await fetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression du produit');
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
      setSuccessMessage('Ordre mis à jour avec succès');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Erreur lors de la réorganisation:', err);
      setError('Erreur lors de la mise à jour de l\'ordre');
      // Reload products to restore correct order
      await fetchProducts();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-primary-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Gestion des Produits</h1>
              <p className="text-primary-100 mt-1">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
              >
                Retour POS
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Category filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                <label htmlFor="showInactive" className="text-sm font-medium text-gray-700">
                  Afficher inactifs
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                className="whitespace-nowrap flex items-center gap-2"
              >
                <Download size={18} />
                Exporter CSV
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingProduct(null);
                  setIsModalOpen(true);
                }}
                className="whitespace-nowrap"
              >
                + Nouveau Produit
              </Button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Chargement des produits...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix HT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TVA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix TTC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordre
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                        {product.is_menu && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                            Menu
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {getCategoryLabel(product.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{parseFloat(product.price_ht).toFixed(2)} €</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{product.vat_rate}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {calculatePriceTTC(product.price_ht, product.vat_rate)} €
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{product.display_order}</span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMoveProduct(filteredProducts.indexOf(product), 'up')}
                              disabled={filteredProducts.indexOf(product) === 0}
                              className="p-0.5 text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Monter"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              onClick={() => handleMoveProduct(filteredProducts.indexOf(product), 'down')}
                              disabled={filteredProducts.indexOf(product) === filteredProducts.length - 1}
                              className="p-0.5 text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Descendre"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setIsModalOpen(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(product)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir supprimer le produit{' '}
                <span className="font-semibold">{deleteConfirm.name}</span> ?
                Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDeleteProduct(deleteConfirm.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Supprimer
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
