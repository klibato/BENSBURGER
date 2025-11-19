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
    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    if (category) {
      where.category = category;
    }

    if (is_menu !== undefined) {
      where.is_menu = is_menu === 'true';
    }

    // Par défaut, ne montrer que les produits actifs
    // Seulement un admin peut voir les produits inactifs si include_inactive est true
    if (include_inactive !== 'true' || req.user?.role !== 'admin') {
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

    const product = await Product.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
      include: [
        {
          model: MenuComposition,
          as: 'menu_items',
          where: { organization_id: req.organizationId },
          required: false, // LEFT JOIN pour ne pas exclure les produits sans compositions
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
      organization_id: req.organizationId, // MULTI-TENANT: Associer à l'organisation
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
        organization_id: req.organizationId, // MULTI-TENANT: Associer à l'organisation
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

    // MULTI-TENANT: Empêcher modification de organization_id
    delete updates.organization_id;

    const product = await Product.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
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

    // Mettre à jour le produit
    await product.update(updates);

    // Si menu_items fourni, mettre à jour les compositions
    if (updates.menu_items && product.is_menu) {
      // Supprimer les anciennes compositions (MULTI-TENANT: filtrer par org)
      await MenuComposition.destroy({
        where: {
          menu_id: id,
          organization_id: req.organizationId,
        },
      });

      // Créer les nouvelles
      if (updates.menu_items.length > 0) {
        const compositions = updates.menu_items.map((item) => ({
          organization_id: req.organizationId, // MULTI-TENANT: Associer à l'organisation
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

    const product = await Product.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
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
        organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
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

/**
 * Mettre à jour l'ordre d'affichage des produits
 * Permet de réorganiser plusieurs produits en une seule requête
 */
const updateProductsOrder = async (req, res, next) => {
  try {
    const { products } = req.body; // Array of {id, display_order}

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Un tableau de produits avec {id, display_order} est requis',
        },
      });
    }

    // Mettre à jour chaque produit
    const updatePromises = products.map((item) =>
      Product.update(
        { display_order: item.display_order },
        {
          where: {
            id: item.id,
            organization_id: req.organizationId // MULTI-TENANT: Sécurité cross-org
          }
        }
      )
    );

    await Promise.all(updatePromises);

    logger.info(`Ordre des produits mis à jour par ${req.user.username} (${products.length} produits)`);

    res.json({
      success: true,
      message: `Ordre de ${products.length} produit(s) mis à jour avec succès`,
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'ordre des produits:', error);
    next(error);
  }
};

/**
 * Exporter les produits en CSV
 */
const exportProductsCSV = async (req, res, next) => {
  try {
    const { category, is_menu, include_inactive = 'true' } = req.query;

    // Construire les filtres
    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    if (category) {
      where.category = category;
    }

    if (is_menu !== undefined) {
      where.is_menu = is_menu === 'true';
    }

    // Inclure les produits inactifs si demandé (admin uniquement)
    if (include_inactive !== 'true' || req.user?.role !== 'admin') {
      where.is_active = true;
    }

    // Récupérer tous les produits
    const products = await Product.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['display_order', 'ASC'],
        ['name', 'ASC'],
      ],
      paranoid: include_inactive !== 'true', // Si on veut les supprimés
    });

    // Formater en CSV
    const csvRows = [];

    // Header
    csvRows.push([
      'ID',
      'Nom',
      'Description',
      'Catégorie',
      'Prix HT (€)',
      'Prix TTC (€)',
      'TVA (%)',
      'Type',
      'Actif',
      'Ordre',
      'Image URL',
    ].join(';'));

    // Lignes de données
    products.forEach((product) => {
      const priceHT = parseFloat(product.price_ht).toFixed(2);
      const priceTTC = parseFloat(product.price_ttc).toFixed(2);
      const vatRate = parseFloat(product.vat_rate).toFixed(2);
      const type = product.is_menu ? 'Menu' : 'Produit';
      const isActive = product.is_active ? 'Oui' : 'Non';

      csvRows.push([
        product.id,
        `"${product.name}"`,
        `"${product.description || ''}"`,
        product.category,
        priceHT,
        priceTTC,
        vatRate,
        type,
        isActive,
        product.display_order,
        `"${product.image_url || ''}"`,
      ].join(';'));
    });

    const csvContent = csvRows.join('\n');

    // Générer le nom de fichier avec la date du jour
    const today = new Date().toISOString().split('T')[0];
    const filename = `produits_${today}.csv`;

    // Headers pour le téléchargement CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Ajouter le BOM UTF-8 pour Excel
    res.write('\ufeff');
    res.end(csvContent);

    logger.info(`Export CSV produits généré par ${req.user.username}: ${products.length} produits`);
  } catch (error) {
    logger.error('Erreur lors de l\'export CSV produits:', error);
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductsOrder,
  getProductsByCategory,
  exportProductsCSV,
};
