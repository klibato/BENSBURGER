const { Product, MenuComposition } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Récupérer tous les produits (avec filtres optionnels)
 */
const getAllProducts = async (req, res, next) => {
  try {
    const {
      category,
      is_menu,
      include_inactive = 'false',
    } = req.query;

    // Construire les filtres
    const where = {};

    if (category) {
      where.category = category;
    }

    if (is_menu !== undefined) {
      where.is_menu = is_menu === 'true';
    }

    // Par défaut, ne montrer que les produits actifs (sauf si demandé par admin)
    if (include_inactive === 'false' || req.user?.role !== 'admin') {
      where.is_active = true;
    }

    // Récupérer les produits
    const products = await Product.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['display_order', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer un produit par ID
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: MenuComposition,
          as: 'menu_items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'price_ht', 'vat_rate'],
            },
          ],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Produit non trouvé',
        },
      });
    }

    // Formater la composition si c'est un menu
    let menu_composition = null;
    if (product.is_menu && product.menu_items) {
      menu_composition = product.menu_items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
      }));
    }

    const productData = product.toJSON();
    productData.menu_composition = menu_composition;

    res.json({
      success: true,
      data: productData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouveau produit (admin only)
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price_ht,
      vat_rate,
      category,
      image_url,
      is_active = true,
      is_menu = false,
      display_order = 0,
      menu_items = [],
    } = req.body;

    // Validation
    if (!name || !price_ht || !vat_rate || !category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Champs requis: name, price_ht, vat_rate, category',
        },
      });
    }

    // Créer le produit
    const product = await Product.create({
      name,
      description,
      price_ht,
      vat_rate,
      category,
      image_url,
      is_active,
      is_menu,
      display_order,
    });

    // Si c'est un menu, créer les compositions
    if (is_menu && menu_items.length > 0) {
      const compositions = menu_items.map((item) => ({
        menu_id: product.id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
      }));

      await MenuComposition.bulkCreate(compositions);
    }

    logger.info(`Produit créé: ${name} (ID: ${product.id})`);

    res.status(201).json({
      success: true,
      data: product.toJSON(),
      message: 'Produit créé avec succès',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier un produit (admin only)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Produit non trouvé',
        },
      });
    }

    // Mettre à jour le produit
    await product.update(updates);

    // Si menu_items fourni, mettre à jour les compositions
    if (updates.menu_items && product.is_menu) {
      // Supprimer les anciennes compositions
      await MenuComposition.destroy({ where: { menu_id: id } });

      // Créer les nouvelles
      if (updates.menu_items.length > 0) {
        const compositions = updates.menu_items.map((item) => ({
          menu_id: product.id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
        }));

        await MenuComposition.bulkCreate(compositions);
      }
    }

    logger.info(`Produit modifié: ${product.name} (ID: ${id})`);

    res.json({
      success: true,
      data: product.toJSON(),
      message: 'Produit modifié avec succès',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un produit (soft delete, admin only)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Produit non trouvé',
        },
      });
    }

    // Soft delete
    await product.destroy();

    logger.info(`Produit supprimé: ${product.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Produit supprimé avec succès',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les produits par catégorie
 */
const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const products = await Product.findAll({
      where: {
        category,
        is_active: true,
      },
      order: [
        ['display_order', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
};
