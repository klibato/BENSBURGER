const { Sale, SaleItem, Product, CashRegister, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Récupérer les statistiques du dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;

    // Calculer les dates selon la période
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Statistiques générales
    const [salesStats] = await Sale.findAll({
      where: {
        organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
        created_at: {
          [Op.gte]: startDate,
        },
        status: 'completed',
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('sales.id')), 'total_sales'],
        [sequelize.fn('SUM', sequelize.col('sales.total_ttc')), 'total_revenue'],
        [sequelize.fn('AVG', sequelize.col('sales.total_ttc')), 'average_ticket'],
        [sequelize.fn('SUM', sequelize.col('sales.total_ht')), 'total_ht'],
      ],
      raw: true,
    });

    // Ventes par mode de paiement
    const salesByPaymentMethod = await Sale.findAll({
      where: {
        organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
        created_at: {
          [Op.gte]: startDate,
        },
        status: 'completed',
      },
      attributes: [
        'payment_method',
        [sequelize.fn('COUNT', sequelize.col('sales.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('sales.total_ttc')), 'total'],
      ],
      group: ['payment_method'],
      raw: true,
    });

    // Top 5 produits les plus vendus
    const topProducts = await SaleItem.findAll({
      attributes: [
        'product_id',
        'product_name',
        [sequelize.fn('SUM', sequelize.col('sale_items.quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('sale_items.total_ttc')), 'total_revenue'],
      ],
      include: [
        {
          model: Sale,
          as: 'sale',
          where: {
            organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
            created_at: {
              [Op.gte]: startDate,
            },
            status: 'completed',
          },
          attributes: [],
        },
      ],
      group: ['sale_items.product_id', 'sale_items.product_name'],
      order: [[sequelize.fn('SUM', sequelize.col('sale_items.quantity')), 'DESC']],
      limit: 5,
      raw: true,
    });

    // Ventes par jour (pour le graphique)
    const salesByDay = await Sale.findAll({
      where: {
        organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
        created_at: {
          [Op.gte]: startDate,
        },
        status: 'completed',
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('sales.created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('sales.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('sales.total_ttc')), 'revenue'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('sales.created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('sales.created_at')), 'ASC']],
      raw: true,
    });

    // Nombre de caisses ouvertes
    const openRegistersCount = await CashRegister.count({
      where: {
        organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
        status: 'open',
      },
    });

    res.json({
      success: true,
      data: {
        period,
        stats: {
          total_sales: parseInt(salesStats.total_sales) || 0,
          total_revenue: parseFloat(salesStats.total_revenue) || 0,
          average_ticket: parseFloat(salesStats.average_ticket) || 0,
          total_ht: parseFloat(salesStats.total_ht) || 0,
          open_registers: openRegistersCount,
        },
        sales_by_payment_method: salesByPaymentMethod,
        top_products: topProducts,
        sales_by_day: salesByDay,
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    next(error);
  }
};

/**
 * Récupérer les ventes par catégorie
 */
const getSalesByCategory = async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Ventes par catégorie via les produits
    const salesByCategory = await SaleItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('sale_items.quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('sale_items.total_ttc')), 'total_revenue'],
      ],
      include: [
        {
          model: Sale,
          as: 'sale',
          where: {
            organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
            created_at: {
              [Op.gte]: startDate,
            },
            status: 'completed',
          },
          attributes: [],
        },
        {
          model: Product,
          as: 'product',
          attributes: ['category'],
        },
      ],
      group: ['product.category'],
      raw: true,
    });

    res.json({
      success: true,
      data: salesByCategory,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des ventes par catégorie:', error);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getSalesByCategory,
};
