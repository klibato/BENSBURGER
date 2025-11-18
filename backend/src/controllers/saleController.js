const { Sale, SaleItem, CashRegister, User, StoreSettings, Product, sequelize } = require('../models');
const { calculateSaleTotals, calculateChange } = require('../services/vatService');
const { generateTicketPDF } = require('../services/pdfService');
const printerService = require('../services/printerService');
const NF525Service = require('../services/nf525Service');
const logger = require('../utils/logger');
const { logAction } = require('../middlewares/audit');

/**
 * Créer une nouvelle vente
 */
const createSale = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { items, payment_method, amount_paid, payment_details, discount } = req.body;

    // Vérifier qu'une caisse est ouverte
    const activeCashRegister = await CashRegister.findOne({
      where: {
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier dans l'organisation
        opened_by: req.user.id,
        status: 'open',
      },
      transaction,
    });

    if (!activeCashRegister) {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        error: {
          code: 'NO_ACTIVE_CASH_REGISTER',
          message: 'Aucune caisse ouverte. Veuillez ouvrir une caisse avant de faire une vente.',
        },
      });
    }

    // Validation
    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Le panier est vide',
        },
      });
    }

    if (!payment_method) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PAYMENT_INFO',
          message: 'Méthode de paiement requise',
        },
      });
    }

    // Calculer les totaux (HT, TTC, TVA)
    let { totalHT, totalTTC, vatDetails } = calculateSaleTotals(items);

    // Calculer la remise si présente
    let discountAmount = 0;
    let discountType = null;
    let discountValue = null;

    if (discount && discount.value > 0) {
      discountType = discount.type;
      discountValue = discount.value;

      if (discount.type === 'percentage') {
        discountAmount = totalTTC * (discount.value / 100);
      } else if (discount.type === 'amount') {
        discountAmount = Math.min(discount.value, totalTTC); // Ne pas dépasser le total
      }

      // Appliquer la remise aux totaux
      totalTTC = Math.max(0, totalTTC - discountAmount);
      totalHT = totalHT * (totalTTC / (totalHT * 1.2)); // Ajuster le HT proportionnellement
    }

    let totalPaid = 0;
    let changeGiven = 0;
    let cashCollected = 0;
    let cashAmount = 0;
    let cardAmount = 0;
    let mealVoucherAmount = 0;

    // Validation selon le mode de paiement
    if (payment_method === 'mixed') {
      // Paiement mixte - valider payment_details
      if (!payment_details || !payment_details.payments || payment_details.payments.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MIXED_PAYMENT',
            message: 'Les détails de paiement mixte sont requis',
          },
        });
      }

      // Calculer le total payé
      payment_details.payments.forEach((p) => {
        const amount = parseFloat(p.amount || 0);
        totalPaid += amount;

        if (p.method === 'cash') cashAmount += amount;
        else if (p.method === 'card') cardAmount += amount;
        else if (p.method === 'meal_voucher') mealVoucherAmount += amount;
      });

      // Vérifier que le montant total payé est suffisant
      if (totalPaid < totalTTC) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PAYMENT',
            message: 'Le montant total payé est insuffisant',
            details: {
              total_due: totalTTC,
              total_paid: totalPaid,
              missing: totalTTC - totalPaid,
            },
          },
        });
      }

      // La monnaie est rendue uniquement sur l'espèces
      changeGiven = calculateChange(totalTTC, totalPaid);
      cashCollected = cashAmount - changeGiven;
    } else {
      // Paiement simple
      if (!amount_paid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAYMENT_AMOUNT',
            message: 'Montant payé requis',
          },
        });
      }

      totalPaid = parseFloat(amount_paid);

      // Vérifier que le montant payé est suffisant
      if (totalPaid < totalTTC) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PAYMENT',
            message: 'Le montant payé est insuffisant',
            details: {
              total_due: totalTTC,
              amount_paid: totalPaid,
              missing: totalTTC - totalPaid,
            },
          },
        });
      }

      // Calculer la monnaie à rendre (seulement pour cash)
      changeGiven = payment_method === 'cash' ? calculateChange(totalTTC, totalPaid) : 0;

      // Calculer les espèces collectées
      if (payment_method === 'cash') {
        cashAmount = totalTTC;
        cashCollected = totalPaid - changeGiven;
      } else if (payment_method === 'card') {
        cardAmount = totalTTC;
      } else if (payment_method === 'meal_voucher') {
        mealVoucherAmount = totalTTC;
      }
    }

    // Créer la vente (le trigger générera automatiquement le ticket_number)
    const sale = await Sale.create(
      {
        organization_id: req.organizationId, // MULTI-TENANT: Associer à l'organisation
        user_id: req.user.id,
        cash_register_id: activeCashRegister.id,
        total_ht: totalHT,
        total_ttc: totalTTC,
        vat_details: vatDetails,
        payment_method,
        payment_details: payment_method === 'mixed' ? payment_details : null,
        amount_paid: totalPaid,
        change_given: changeGiven,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        status: 'completed',
      },
      { transaction }
    );

    // Créer les lignes de vente
    const saleItemsData = items.map((item) => ({
      organization_id: req.organizationId, // MULTI-TENANT: Associer à l'organisation
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_ht: parseFloat(item.unit_price_ht),
      vat_rate: parseFloat(item.vat_rate),
      total_ht: parseFloat(item.total_ht),
      total_ttc: parseFloat(item.total_ttc),
      discount_percent: item.discount_percent || 0,
      discount_amount: item.discount_amount || 0,
    }));

    await SaleItem.bulkCreate(saleItemsData, { transaction });

    // Décrémenter les stocks des produits vendus
    for (const item of items) {
      try {
        const product = await Product.findOne({
          where: {
            id: item.product_id,
            organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
          },
          transaction,
        });

        if (!product) {
          logger.warn(`Produit non trouvé pour décrémentation stock: ID ${item.product_id}`);
          continue;
        }

        // Décrémenter le stock (cette méthode gère les menus automatiquement)
        await product.decrementStock(item.quantity);

        logger.info(`Stock décrémenté: ${product.name} - Quantité: ${item.quantity}, Nouveau stock: ${product.quantity}`);
      } catch (error) {
        // Si erreur de stock insuffisant, on rollback toute la transaction
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message || `Stock insuffisant pour un ou plusieurs produits`,
          },
        });
      }
    }

    // Mettre à jour les totaux de la caisse
    await activeCashRegister.update(
      {
        total_sales: parseFloat(activeCashRegister.total_sales || 0) + totalTTC,
        total_cash: parseFloat(activeCashRegister.total_cash || 0) + cashAmount,
        total_card: parseFloat(activeCashRegister.total_card || 0) + cardAmount,
        total_meal_voucher: parseFloat(activeCashRegister.total_meal_voucher || 0) + mealVoucherAmount,
        total_cash_collected: parseFloat(activeCashRegister.total_cash_collected || 0) + cashCollected,
        ticket_count: parseInt(activeCashRegister.ticket_count || 0) + 1,
      },
      { transaction }
    );

    // ============================================
    // NF525: Créer hash chain pour conformité anti-fraude TVA
    // ============================================
    try {
      // Charger les items dans l'objet sale (requis pour hash)
      sale.items = saleItemsData;

      // Créer entrée hash chain (DOIT être dans même transaction)
      const hashEntry = await NF525Service.createHashChainEntry(sale, transaction);

      logger.info(
        `✅ NF525: Hash #${hashEntry.sequence_number} créé pour vente ${sale.ticket_number} ` +
          `(hash: ${hashEntry.current_hash.substring(0, 16)}...)`
      );
    } catch (nf525Error) {
      // Si échec NF525, rollback TOUTE la transaction (critère bloquant)
      await transaction.rollback();
      logger.error('❌ NF525: Échec création hash chain:', nf525Error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'NF525_HASH_CREATION_FAILED',
          message:
            'Erreur NF525: Impossible de créer le hash de conformité. ' +
            'La vente a été annulée pour garantir la conformité fiscale.',
          details: nf525Error.message,
        },
      });
    }

    // Commit de la transaction
    await transaction.commit();

    // Recharger la vente avec les items et le user
    const completeSale = await Sale.findOne({
      where: {
        id: sale.id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
      include: [
        {
          model: SaleItem,
          as: 'items',
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    logger.info(
      `Vente créée: ${completeSale.ticket_number} - ${totalTTC}€ (${payment_method}) par ${req.user.username}`
    );

    // Logger l'action dans audit_logs
    setImmediate(() => {
      logAction(req, 'SALE', 'sale', completeSale.id, {
        ticket_number: completeSale.ticket_number,
        total_ttc: totalTTC,
        payment_method,
        items_count: items.length,
      });
    });

    // Impression automatique du ticket (en arrière-plan, ne pas bloquer la réponse)
    setImmediate(async () => {
      try {
        // MULTI-TENANT: Utiliser req.organization.settings au lieu de StoreSettings
        const settingsData = req.organization.settings || {};

        // Ajouter unit_price_ttc aux items
        const saleData = completeSale.toJSON();
        saleData.items = saleData.items.map((item) => {
          const unitPriceHt = parseFloat(item.unit_price_ht);
          const vatRate = parseFloat(item.vat_rate);
          const unit_price_ttc = unitPriceHt * (1 + vatRate / 100);

          return {
            ...item,
            unit_price_ttc: unit_price_ttc.toFixed(2),
          };
        });

        await printerService.printSaleTicket(saleData, settingsData);
      } catch (printError) {
        logger.error('Erreur lors de l\'impression automatique:', printError);
        // Ne pas bloquer la vente même si l'impression échoue
      }
    });

    res.status(201).json({
      success: true,
      data: completeSale,
      message: 'Vente enregistrée avec succès',
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur lors de la création de la vente:', error);
    next(error);
  }
};

/**
 * Récupérer toutes les ventes (avec filtres)
 */
const getAllSales = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      user_id,
      payment_method,
      status = 'completed',
      limit = 50,
      offset = 0,
    } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    // Filtres
    if (start_date) {
      where.created_at = {
        ...where.created_at,
        [sequelize.Op.gte]: new Date(start_date),
      };
    }

    if (end_date) {
      where.created_at = {
        ...where.created_at,
        [sequelize.Op.lte]: new Date(end_date),
      };
    }

    if (user_id && req.user.role === 'admin') {
      where.user_id = user_id;
    } else if (req.user.role === 'cashier') {
      // Les caissiers ne voient que leurs ventes
      where.user_id = req.user.id;
    }

    if (payment_method) {
      where.payment_method = payment_method;
    }

    if (status) {
      where.status = status;
    }

    // Récupérer les ventes
    const { count, rows: sales } = await Sale.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: SaleItem,
          as: 'items',
        },
      ],
    });

    res.json({
      success: true,
      data: {
        sales,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: count > parseInt(offset) + parseInt(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer une vente par ID
 */
const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
      include: [
        {
          model: SaleItem,
          as: 'items',
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

    // Les caissiers ne peuvent voir que leurs propres ventes
    if (req.user.role === 'cashier' && sale.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès refusé',
        },
      });
    }

    res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Générer un PDF du ticket de caisse
 */
const generateTicketPDFEndpoint = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Récupérer la vente avec tous les détails
    const sale = await Sale.findOne({
      where: {
        id,
        organization_id: req.organizationId, // MULTI-TENANT: Vérifier l'organisation
      },
      include: [
        {
          model: SaleItem,
          as: 'items',
        },
        {
          model: CashRegister,
          as: 'cash_register',
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'username'],
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

    // Vérifier les permissions
    if (req.user.role !== 'admin' && sale.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès refusé',
        },
      });
    }

    // Récupérer les paramètres du commerce depuis l'organisation
    // MULTI-TENANT: Utiliser req.organization.settings au lieu de StoreSettings
    const settings = req.organization.settings || {};

    // Générer le PDF
    const doc = generateTicketPDF(sale, sale.cash_register, sale.user, settings);

    // Configurer les headers pour le téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${sale.ticket_number}.pdf"`
    );

    // Streamer le PDF vers la réponse
    doc.pipe(res);
    doc.end();

    logger.info(`PDF généré pour le ticket ${sale.ticket_number} par ${req.user.username}`);
  } catch (error) {
    logger.error('Erreur lors de la génération du PDF:', error);
    next(error);
  }
};

/**
 * Exporter les ventes en CSV
 */
const exportSalesCSV = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      user_id,
      payment_method,
      status,
    } = req.query;

    const where = {
      organization_id: req.organizationId, // MULTI-TENANT: Filtrer par organisation
    };

    // Filtres (mêmes que getAllSales)
    if (start_date) {
      where.created_at = {
        ...where.created_at,
        [sequelize.Op.gte]: new Date(start_date),
      };
    }

    if (end_date) {
      where.created_at = {
        ...where.created_at,
        [sequelize.Op.lte]: new Date(end_date),
      };
    }

    if (user_id && req.user.role === 'admin') {
      where.user_id = user_id;
    } else if (req.user.role === 'cashier') {
      where.user_id = req.user.id;
    }

    if (payment_method) {
      where.payment_method = payment_method;
    }

    if (status) {
      where.status = status;
    }

    // Récupérer toutes les ventes (pas de limit pour l'export)
    const sales = await Sale.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: SaleItem,
          as: 'items',
        },
        {
          model: User,
          as: 'user',
          attributes: ['username', 'first_name', 'last_name'],
        },
      ],
    });

    // Formater en CSV
    const csvRows = [];

    // Header
    csvRows.push([
      'Date',
      'Ticket',
      'Vendeur',
      'Paiement',
      'Montant TTC (€)',
      'Produits',
      'Quantité totale',
      'Statut',
    ].join(';'));

    // Lignes de données
    sales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const vendeur = sale.user
        ? `${sale.user.first_name || ''} ${sale.user.last_name || ''}`.trim() || sale.user.username
        : 'N/A';

      const paymentMethodLabels = {
        cash: 'Espèces',
        card: 'Carte bancaire',
        meal_voucher: 'Ticket restaurant',
        mixed: 'Mixte',
      };
      const paymentMethod = paymentMethodLabels[sale.payment_method] || sale.payment_method;

      const totalTTC = parseFloat(sale.total_ttc).toFixed(2);

      // Liste des produits
      const products = sale.items
        ? sale.items.map((item) => `${item.product_name} (x${item.quantity})`).join(', ')
        : '';

      // Quantité totale d'articles
      const totalQuantity = sale.items
        ? sale.items.reduce((sum, item) => sum + parseInt(item.quantity), 0)
        : 0;

      const statusLabels = {
        completed: 'Complétée',
        cancelled: 'Annulée',
        refunded: 'Remboursée',
      };
      const status = statusLabels[sale.status] || sale.status;

      csvRows.push([
        date,
        sale.ticket_number,
        vendeur,
        paymentMethod,
        totalTTC,
        `"${products}"`, // Encadrer avec guillemets pour gérer les virgules
        totalQuantity,
        status,
      ].join(';'));
    });

    const csvContent = csvRows.join('\n');

    // Générer le nom de fichier avec la date du jour
    const today = new Date().toISOString().split('T')[0];
    const filename = `ventes_${today}.csv`;

    // Headers pour le téléchargement CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Ajouter le BOM UTF-8 pour Excel
    res.write('\ufeff');
    res.end(csvContent);

    logger.info(`Export CSV généré par ${req.user.username}: ${sales.length} ventes`);
  } catch (error) {
    logger.error('Erreur lors de l\'export CSV:', error);
    next(error);
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  generateTicketPDFEndpoint,
  exportSalesCSV,
};
