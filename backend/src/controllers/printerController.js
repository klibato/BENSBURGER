const { Sale, SaleItem, Product, User, CashRegister, StoreSettings } = require('../models');
const printerService = require('../services/printerService');
const logger = require('../utils/logger');

/**
 * Imprimer un ticket de test
 */
const printTest = async (req, res, next) => {
  try {
    const result = await printerService.printTestTicket();

    if (result.success) {
      logger.info(`Test d'impression effectué par ${req.user.username}`);
      return res.json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PRINT_ERROR',
          message: result.message,
        },
      });
    }
  } catch (error) {
    logger.error('Erreur lors du test d\'impression:', error);
    next(error);
  }
};

/**
 * Réimprimer un ticket de vente
 */
const reprintSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Récupérer la vente avec tous les détails
    const sale = await Sale.findByPk(id, {
      include: [
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vente non trouvée',
        },
      });
    }

    // Récupérer les paramètres du commerce
    const settings = await StoreSettings.findOne();
    const settingsData = settings ? settings.toJSON() : {};

    // Ajouter unit_price_ttc aux items (calculé à partir de unit_price_ht + vat_rate)
    const saleData = sale.toJSON();
    saleData.items = saleData.items.map((item) => {
      const unitPriceHt = parseFloat(item.unit_price_ht);
      const vatRate = parseFloat(item.vat_rate);
      const unit_price_ttc = unitPriceHt * (1 + vatRate / 100);

      return {
        ...item,
        unit_price_ttc: unit_price_ttc.toFixed(2),
      };
    });

    // Imprimer le ticket
    const result = await printerService.printSaleTicket(saleData, settingsData);

    if (result.success) {
      logger.info(`Ticket N°${sale.ticket_number} réimprimé par ${req.user.username}`);
      return res.json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PRINT_ERROR',
          message: result.message,
        },
      });
    }
  } catch (error) {
    logger.error('Erreur lors de la réimpression:', error);
    next(error);
  }
};

/**
 * Imprimer un ticket X (rapport intermédiaire)
 */
const printXReport = async (req, res, next) => {
  try {
    // Récupérer la caisse ouverte de l'utilisateur
    const cashRegister = await CashRegister.findOne({
      where: {
        user_id: req.user.id,
        status: 'open',
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_OPEN_REGISTER',
          message: 'Aucune caisse ouverte',
        },
      });
    }

    // Calculer les totaux depuis l'ouverture
    const sales = await Sale.findAll({
      where: {
        user_id: req.user.id,
        created_at: {
          [require('sequelize').Op.gte]: cashRegister.opened_at,
        },
        status: 'completed',
      },
    });

    let totalSales = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalMealVoucher = 0;

    sales.forEach((sale) => {
      totalSales += parseFloat(sale.total_ttc);

      if (sale.payment_method === 'cash') {
        totalCash += parseFloat(sale.total_ttc);
      } else if (sale.payment_method === 'card') {
        totalCard += parseFloat(sale.total_ttc);
      } else if (sale.payment_method === 'meal_voucher') {
        totalMealVoucher += parseFloat(sale.total_ttc);
      } else if (sale.payment_method === 'mixed' && sale.payment_details) {
        totalCash += parseFloat(sale.payment_details.cash || 0);
        totalCard += parseFloat(sale.payment_details.card || 0);
        totalMealVoucher += parseFloat(sale.payment_details.meal_voucher || 0);
      }
    });

    const report = {
      cashier_name: `${cashRegister.user.first_name} ${cashRegister.user.last_name}`,
      ticket_count: sales.length,
      total_sales: totalSales.toFixed(2),
      total_cash: totalCash.toFixed(2),
      total_card: totalCard.toFixed(2),
      total_meal_voucher: totalMealVoucher.toFixed(2),
    };

    // Récupérer les paramètres du commerce
    const settings = await StoreSettings.findOne();
    const settingsData = settings ? settings.toJSON() : {};

    // Imprimer le ticket X
    const result = await printerService.printXReport(report, settingsData);

    if (result.success) {
      logger.info(`Ticket X imprimé par ${req.user.username}`);
      return res.json({
        success: true,
        message: result.message,
        data: report,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PRINT_ERROR',
          message: result.message,
        },
      });
    }
  } catch (error) {
    logger.error('Erreur lors de l\'impression du ticket X:', error);
    next(error);
  }
};

/**
 * Imprimer un ticket Z (rapport de clôture)
 */
const printZReport = async (req, res, next) => {
  try {
    const { registerId } = req.params;

    // Récupérer la caisse clôturée
    const cashRegister = await CashRegister.findByPk(registerId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Caisse non trouvée',
        },
      });
    }

    if (cashRegister.status !== 'closed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTER_NOT_CLOSED',
          message: 'La caisse n\'est pas clôturée',
        },
      });
    }

    // Vérifier que c'est la caisse de l'utilisateur ou admin
    if (cashRegister.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vous n\'avez pas accès à cette caisse',
        },
      });
    }

    // Récupérer les paramètres du commerce
    const settings = await StoreSettings.findOne();
    const settingsData = settings ? settings.toJSON() : {};

    // Imprimer le ticket Z
    const result = await printerService.printZReport(cashRegister, settingsData);

    if (result.success) {
      logger.info(`Ticket Z imprimé pour la caisse #${registerId} par ${req.user.username}`);
      return res.json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PRINT_ERROR',
          message: result.message,
        },
      });
    }
  } catch (error) {
    logger.error('Erreur lors de l\'impression du ticket Z:', error);
    next(error);
  }
};

module.exports = {
  printTest,
  reprintSale,
  printXReport,
  printZReport,
};
