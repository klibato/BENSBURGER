// Taux de TVA
export const VAT_RATES = {
  REDUCED: 5.5,
  INTERMEDIATE: 10.0,
  STANDARD: 20.0,
};

// Catégories de produits
export const CATEGORIES = {
  BURGERS: 'burgers',
  SIDES: 'sides',
  DRINKS: 'drinks',
  DESSERTS: 'desserts',
  MENUS: 'menus',
};

export const CATEGORY_LABELS = {
  [CATEGORIES.BURGERS]: 'Burgers',
  [CATEGORIES.SIDES]: 'Accompagnements',
  [CATEGORIES.DRINKS]: 'Boissons',
  [CATEGORIES.DESSERTS]: 'Desserts',
  [CATEGORIES.MENUS]: 'Menus',
};

// Méthodes de paiement
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MEAL_VOUCHER: 'meal_voucher',
  MIXED: 'mixed',
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Espèces',
  [PAYMENT_METHODS.CARD]: 'Carte Bancaire',
  [PAYMENT_METHODS.MEAL_VOUCHER]: 'Titres Restaurant',
  [PAYMENT_METHODS.MIXED]: 'Paiement Mixte',
};

// Rôles utilisateurs
export const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier',
};

// Format de devise
export const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

// Calculer le prix TTC
export const calculateTTC = (priceHT, vatRate) => {
  return parseFloat((priceHT * (1 + vatRate / 100)).toFixed(2));
};
