import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Charger le panier depuis localStorage au démarrage
  useEffect(() => {
    const savedCart = localStorage.getItem('pos_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
      }
    }
  }, []);

  // Sauvegarder le panier dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  /**
   * Ajouter un produit au panier
   */
  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);

      if (existingItem) {
        // Incrémenter la quantité si le produit existe déjà
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      // Ajouter le nouveau produit
      return [...prev, { ...product, quantity }];
    });
  };

  /**
   * Retirer un produit du panier
   */
  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  /**
   * Mettre à jour la quantité d'un produit
   */
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  /**
   * Incrémenter la quantité
   */
  const incrementQuantity = (productId) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  /**
   * Décrémenter la quantité
   */
  const decrementQuantity = (productId) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /**
   * Vider le panier
   */
  const clearCart = () => {
    setCart([]);
  };

  /**
   * Calculer le total du panier
   */
  const getTotal = () => {
    return cart.reduce(
      (sum, item) => sum + parseFloat(item.price_ttc) * item.quantity,
      0
    );
  };

  /**
   * Obtenir le nombre total d'articles
   */
  const getItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  /**
   * Vérifier si un produit est dans le panier
   */
  const isInCart = (productId) => {
    return cart.some((item) => item.id === productId);
  };

  /**
   * Obtenir la quantité d'un produit
   */
  const getQuantity = (productId) => {
    const item = cart.find((item) => item.id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getTotal,
    getItemCount,
    isInCart,
    getQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
