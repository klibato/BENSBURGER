const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, optionalAuthenticate, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

// GET /api/products - Récupérer tous les produits (avec auth optionnelle pour admins)
router.get('/', optionalAuthenticate, productController.getAllProducts);

// GET /api/products/export/csv - Exporter les produits en CSV
router.get('/export/csv', authenticateToken, requirePermission(PERMISSIONS.PRODUCTS_VIEW), productController.exportProductsCSV);

// GET /api/products/category/:category - Produits par catégorie
router.get('/category/:category', productController.getProductsByCategory);

// GET /api/products/:id - Récupérer un produit
router.get('/:id', productController.getProductById);

// POST /api/products - Créer un produit
router.post('/', authenticateToken, requirePermission(PERMISSIONS.PRODUCTS_CREATE), productController.createProduct);

// PUT /api/products/reorder - Mettre à jour l'ordre d'affichage des produits
router.put('/reorder', authenticateToken, requirePermission(PERMISSIONS.PRODUCTS_UPDATE), productController.updateProductsOrder);

// PUT /api/products/:id - Modifier un produit
router.put('/:id', authenticateToken, requirePermission(PERMISSIONS.PRODUCTS_UPDATE), productController.updateProduct);

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', authenticateToken, requirePermission(PERMISSIONS.PRODUCTS_DELETE), productController.deleteProduct);

module.exports = router;
