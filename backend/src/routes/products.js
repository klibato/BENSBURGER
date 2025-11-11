const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, optionalAuthenticate, requireAdmin } = require('../middlewares/auth');

// GET /api/products - Récupérer tous les produits (avec auth optionnelle pour admins)
router.get('/', optionalAuthenticate, productController.getAllProducts);

// GET /api/products/category/:category - Produits par catégorie
router.get('/category/:category', productController.getProductsByCategory);

// GET /api/products/:id - Récupérer un produit
router.get('/:id', productController.getProductById);

// POST /api/products - Créer un produit (admin only)
router.post('/', authenticateToken, requireAdmin, productController.createProduct);

// PUT /api/products/:id - Modifier un produit (admin only)
router.put('/:id', authenticateToken, requireAdmin, productController.updateProduct);

// DELETE /api/products/:id - Supprimer un produit (admin only)
router.delete('/:id', authenticateToken, requireAdmin, productController.deleteProduct);

module.exports = router;
