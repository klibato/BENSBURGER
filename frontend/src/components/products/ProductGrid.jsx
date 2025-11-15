import React from 'react';
import ProductCard from './ProductCard';

/**
 * Grille de produits responsive
 * Optimisée pour tablette avec grille adaptative
 */
const ProductGrid = ({ products, onProductClick, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🍔</span>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Aucun produit disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={onProductClick}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
