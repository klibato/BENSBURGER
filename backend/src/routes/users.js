const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Toutes les routes nécessitent une authentification admin
router.use(authenticateToken, requireAdmin);

/**
 * @route   GET /api/users
 * @desc    Récupérer tous les utilisateurs
 * @access  Admin only
 * @query   include_inactive - true|false
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Récupérer un utilisateur par ID
 * @access  Admin only
 */
router.get('/:id', userController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Créer un nouvel utilisateur
 * @access  Admin only
 */
router.post('/', userController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Modifier un utilisateur
 * @access  Admin only
 */
router.put('/:id', userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Désactiver un utilisateur
 * @access  Admin only
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
