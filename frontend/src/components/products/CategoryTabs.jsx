import React from 'react';
import { useStoreConfig } from '../../context/StoreConfigContext';

/**
 * Composant d'onglets pour filtrer par catégorie
 * Design tactile avec boutons larges
 * Les catégories sont chargées dynamiquement depuis la configuration du commerce
 */
const CategoryTabs = ({ selectedCategory, onCategoryChange }) => {
  const { config } = useStoreConfig();

  // Créer les catégories à afficher (Tous + catégories configurées)
  const categories = [
    { id: 'all', name: 'Tous', icon: '🍽️', color: '#6B7280' },
    ...(config.categories || []),
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const buttonStyle = isSelected
          ? { backgroundColor: category.color || config.theme_color || '#FF6B35' }
          : {};

        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            style={buttonStyle}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transition-all duration-150 active:scale-95
              whitespace-nowrap min-h-touch select-none
              ${
                isSelected
                  ? 'text-white shadow-lg'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600'
              }
            `}
          >
            <span className="text-2xl">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
