const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requirePermission } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/permissions');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route   GET /api/users
 * @desc    Récupérer tous les utilisateurs
 * @access  Admin only
 * @query   include_inactive - true|false
 */
router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Récupérer un utilisateur par ID
 * @access  Admin only
 */
router.get('/:id', requirePermission(PERMISSIONS.USERS_VIEW), userController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Créer un nouvel utilisateur
 * @access  Admin only
 */
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), userController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Modifier un utilisateur
 * @access  Admin only
 */
router.put('/:id', requirePermission(PERMISSIONS.USERS_UPDATE), userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Désactiver un utilisateur
 * @access  Admin only
 */
router.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), userController.deleteUser);

module.exports = router;
