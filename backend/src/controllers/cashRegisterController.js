const { CashRegister, Sale, SaleItem, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Récupérer toutes les caisses
 */
const getAllCashRegisters = async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const { count, rows: cashRegisters } = await CashRegister.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'openedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
        {
          model: User,
          as: 'closedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        cash_registers: cashRegisters,
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
 * Récupérer la caisse active de l'utilisateur
 */
const getActiveCashRegister = async (req, res, next) => {
  try {
    const cashRegister = await CashRegister.findOne({
      where: {
        opened_by: req.user.id,
        status: 'open',
      },
      include: [
        {
          model: User,
          as: 'openedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_ACTIVE_REGISTER',
          message: 'Aucune caisse active pour cet utilisateur',
        },
      });
    }

    res.json({
      success: true,
      data: cashRegister,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ouvrir une nouvelle caisse
 */
const openCashRegister = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { register_name, opening_balance, notes } = req.body;

    // Validation
    if (!register_name) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REGISTER_NAME',
          message: 'Le nom de la caisse est requis',
        },
      });
    }

    if (opening_balance === undefined || opening_balance < 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPENING_BALANCE',
          message: 'Le fond de caisse doit être >= 0',
        },
      });
    }

    // Vérifier qu'il n'y a pas déjà une caisse ouverte pour cet utilisateur
    const existingOpen = await CashRegister.findOne({
      where: {
        opened_by: req.user.id,
        status: 'open',
      },
    });

    if (existingOpen) {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        error: {
          code: 'REGISTER_ALREADY_OPEN',
          message: 'Vous avez déjà une caisse ouverte',
          details: {
            register_id: existingOpen.id,
            register_name: existingOpen.register_name,
            opened_at: existingOpen.opened_at,
          },
        },
      });
    }

    // Créer la nouvelle caisse
    const cashRegister = await CashRegister.create(
      {
        register_name,
        opened_by: req.user.id,
        opened_at: new Date(),
        opening_balance: parseFloat(opening_balance),
        status: 'open',
        notes,
      },
      { transaction }
    );

    await transaction.commit();

    // Recharger avec les associations
    const completeCashRegister = await CashRegister.findByPk(cashRegister.id, {
      include: [
        {
          model: User,
          as: 'openedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    logger.info(
      `Caisse ouverte: ${register_name} par ${req.user.username} - Fond: ${opening_balance}€`
    );

    res.status(201).json({
      success: true,
      data: completeCashRegister,
      message: 'Caisse ouverte avec succès',
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur lors de l\'ouverture de la caisse:', error);
    next(error);
  }
};

/**
 * Fermer une caisse
 */
const closeCashRegister = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { closing_balance, counted_cash, notes } = req.body;

    // Validation
    if (closing_balance === undefined || closing_balance < 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CLOSING_BALANCE',
          message: 'Le solde de fermeture doit être >= 0',
        },
      });
    }

    if (counted_cash === undefined || counted_cash < 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COUNTED_CASH',
          message: 'Le montant compté doit être >= 0',
        },
      });
    }

    // Récupérer la caisse
    const cashRegister = await CashRegister.findByPk(id, { transaction });

    if (!cashRegister) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTER_NOT_FOUND',
          message: 'Caisse introuvable',
        },
      });
    }

    // Vérifier que c'est bien la caisse de l'utilisateur (ou admin)
    if (cashRegister.opened_by !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vous ne pouvez fermer que votre propre caisse',
        },
      });
    }

    // Vérifier que la caisse est ouverte
    if (cashRegister.status !== 'open') {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        error: {
          code: 'REGISTER_NOT_OPEN',
          message: 'Cette caisse n\'est pas ouverte',
        },
      });
    }

    // Calculer les ventes de la caisse
    const sales = await Sale.findAll({
      where: {
        cash_register_id: id,
        status: 'completed',
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sales'],
        [sequelize.fn('SUM', sequelize.col('total_ttc')), 'total_amount'],
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'total_paid'],
        [sequelize.fn('SUM', sequelize.col('change_given')), 'total_change'],
      ],
      transaction,
    });

    const salesStats = sales[0] || {};
    const totalSales = parseInt(salesStats.dataValues.total_sales) || 0;
    const totalAmount = parseFloat(salesStats.dataValues.total_amount) || 0;
    const totalPaid = parseFloat(salesStats.dataValues.total_paid) || 0;
    const totalChange = parseFloat(salesStats.dataValues.total_change) || 0;

    // Calculer les espèces encaissées (sans la monnaie rendue)
    const cashCollected = totalPaid - totalChange;

    // Calculer le théorique (fond + encaissements)
    const expectedBalance = parseFloat(cashRegister.opening_balance) + cashCollected;

    // Calculer la différence (écart)
    const difference = parseFloat(counted_cash) - expectedBalance;

    // Mettre à jour la caisse
    await cashRegister.update(
      {
        status: 'closed',
        closed_by: req.user.id,
        closed_at: new Date(),
        closing_balance: parseFloat(closing_balance),
        counted_cash: parseFloat(counted_cash),
        expected_balance: expectedBalance,
        difference: difference,
        total_sales: totalSales,
        total_cash_collected: cashCollected,
        notes: notes || cashRegister.notes,
      },
      { transaction }
    );

    await transaction.commit();

    // Recharger avec les associations
    const completeCashRegister = await CashRegister.findByPk(id, {
      include: [
        {
          model: User,
          as: 'openedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
        {
          model: User,
          as: 'closedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    logger.info(
      `Caisse fermée: ${cashRegister.register_name} par ${req.user.username} - Différence: ${difference}€`
    );

    res.json({
      success: true,
      data: completeCashRegister,
      message: 'Caisse fermée avec succès',
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Erreur lors de la fermeture de la caisse:', error);
    next(error);
  }
};

/**
 * Récupérer une caisse par ID
 */
const getCashRegisterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cashRegister = await CashRegister.findByPk(id, {
      include: [
        {
          model: User,
          as: 'openedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
        {
          model: User,
          as: 'closedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
        },
      ],
    });

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Caisse introuvable',
        },
      });
    }

    // Les caissiers ne peuvent voir que leurs propres caisses
    if (
      req.user.role === 'cashier' &&
      cashRegister.opened_by !== req.user.id
    ) {
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
      data: cashRegister,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exporter les clôtures de caisse en CSV
 */
const exportCashRegistersCSV = async (req, res, next) => {
  try {
    const { status, start_date, end_date } = req.query;

    const where = {};

    // Filtrer par statut (par défaut, uniquement les caisses fermées)
    if (status) {
      where.status = status;
    } else {
      where.status = 'closed'; // Par défaut, exporter seulement les fermées
    }

    // Filtres de dates
    if (start_date) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(start_date),
      };
    }

    if (end_date) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(end_date),
      };
    }

    // Récupérer toutes les caisses
    const cashRegisters = await CashRegister.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'openedByUser',
          attributes: ['username', 'first_name', 'last_name'],
        },
        {
          model: User,
          as: 'closedByUser',
          attributes: ['username', 'first_name', 'last_name'],
        },
      ],
    });

    // Formater en CSV
    const csvRows = [];

    // Header
    csvRows.push([
      'ID',
      'Date ouverture',
      'Date clôture',
      'Ouvert par',
      'Fermé par',
      'Statut',
      'Fond de caisse (€)',
      'Total ventes (€)',
      'Espèces (€)',
      'Carte bancaire (€)',
      'Tickets restaurant (€)',
      'Espèces collectées (€)',
      'Montant compté (€)',
      'Différence (€)',
      'Nb tickets',
      'Notes',
    ].join(';'));

    // Lignes de données
    cashRegisters.forEach((register) => {
      const dateOpened = new Date(register.opened_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const dateClosed = register.closed_at
        ? new Date(register.closed_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      const openedBy = register.openedByUser
        ? `${register.openedByUser.first_name || ''} ${register.openedByUser.last_name || ''}`.trim() ||
          register.openedByUser.username
        : 'N/A';

      const closedBy = register.closedByUser
        ? `${register.closedByUser.first_name || ''} ${register.closedByUser.last_name || ''}`.trim() ||
          register.closedByUser.username
        : '';

      const statusLabels = {
        open: 'Ouverte',
        closed: 'Fermée',
      };
      const status = statusLabels[register.status] || register.status;

      const openingBalance = parseFloat(register.opening_balance || 0).toFixed(2);
      const totalSales = parseFloat(register.total_sales || 0).toFixed(2);
      const totalCash = parseFloat(register.total_cash || 0).toFixed(2);
      const totalCard = parseFloat(register.total_card || 0).toFixed(2);
      const totalMealVoucher = parseFloat(register.total_meal_voucher || 0).toFixed(2);
      const totalCashCollected = parseFloat(register.total_cash_collected || 0).toFixed(2);
      const closingBalance = parseFloat(register.closing_balance || 0).toFixed(2);
      const difference = parseFloat(register.difference || 0).toFixed(2);
      const ticketCount = register.ticket_count || 0;

      csvRows.push([
        register.id,
        dateOpened,
        dateClosed,
        openedBy,
        closedBy,
        status,
        openingBalance,
        totalSales,
        totalCash,
        totalCard,
        totalMealVoucher,
        totalCashCollected,
        closingBalance,
        difference,
        ticketCount,
        `"${register.notes || ''}"`,
      ].join(';'));
    });

    const csvContent = csvRows.join('\n');

    // Générer le nom de fichier avec la date du jour
    const today = new Date().toISOString().split('T')[0];
    const filename = `clotures_caisse_${today}.csv`;

    // Headers pour le téléchargement CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Ajouter le BOM UTF-8 pour Excel
    res.write('\ufeff');
    res.end(csvContent);

    logger.info(`Export CSV clôtures généré par ${req.user.username}: ${cashRegisters.length} clôtures`);
  } catch (error) {
    logger.error('Erreur lors de l\'export CSV clôtures:', error);
    next(error);
  }
};

module.exports = {
  getAllCashRegisters,
  getActiveCashRegister,
  openCashRegister,
  closeCashRegister,
  getCashRegisterById,
  exportCashRegistersCSV,
};
