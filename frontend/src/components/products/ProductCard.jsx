import React from 'react';
import { formatPrice } from '../../utils/constants';

/**
 * Carte produit optimisée tactile (min 80x80px)
 * Utilise React.memo pour optimiser les performances
 */
const ProductCard = React.memo(({ product, onClick }) => {
  const { name, price_ttc, category, image_url, is_menu, is_out_of_stock, is_low_stock, quantity } = product;

  // Icône par défaut selon la catégorie
  const getCategoryIcon = () => {
    const icons = {
      burgers: '🍔',
      sides: '🍟',
      drinks: '🥤',
      desserts: '🍰',
      menus: '📦',
    };
    return icons[category] || '🍽️';
  };

  // Désactiver le clic si rupture de stock
  const handleClick = () => {
    if (is_out_of_stock && !is_menu) {
      alert(`⚠️ ${name} est en rupture de stock !`);
      return;
    }
    onClick(product);
  };

  return (
    <div
      onClick={handleClick}
      className={`product-card group relative ${is_out_of_stock && !is_menu ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {/* Badge stock (en haut à gauche) */}
      {!is_menu && is_out_of_stock && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
          RUPTURE
        </div>
      )}
      {!is_menu && !is_out_of_stock && is_low_stock && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
          ⚡ {quantity}
        </div>
      )}

      {/* Badge menu (en haut à droite) */}
      {is_menu && (
        <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          MENU
        </div>
      )}

      {/* Image ou icône */}
      <div className="flex items-center justify-center h-20 mb-3">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <span className="text-5xl">{getCategoryIcon()}</span>
        )}
      </div>

      {/* Nom du produit */}
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-center mb-2 line-clamp-2 min-h-[3rem]">
        {name}
      </h3>

      {/* Prix */}
      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 text-center">
        {formatPrice(price_ttc)}
      </p>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
