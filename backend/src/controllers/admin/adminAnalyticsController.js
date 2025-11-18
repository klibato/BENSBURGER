const { Organization, Subscription, Invoice, Sale, sequelize } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

// GET /api/admin/analytics/dashboard - Dashboard global
const getDashboard = async (req, res, next) => {
  try {
    // Total organisations
    const totalOrgs = await Organization.count();
    const activeOrgs = await Organization.count({ where: { status: 'active' } });

    // MRR (Monthly Recurring Revenue)
    const activeSubs = await Subscription.findAll({
      where: { status: 'active', billing_interval: 'monthly' },
      attributes: ['price_cents'],
    });
    const mrr = activeSubs.reduce((sum, sub) => sum + sub.price_cents, 0) / 100;

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Revenus du mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Invoice.sum('total_cents', {
      where: {
        status: 'paid',
        paid_at: { [Op.gte]: startOfMonth },
      },
    }) || 0;

    // Nouvelles organisations ce mois
    const newOrgsThisMonth = await Organization.count({
      where: {
        created_at: { [Op.gte]: startOfMonth },
      },
    });

    // Churn (organisations annulées ce mois)
    const churnedOrgsThisMonth = await Organization.count({
      where: {
        status: 'cancelled',
        updated_at: { [Op.gte]: startOfMonth },
      },
    });

    return res.json({
      success: true,
      data: {
        organizations: {
          total: totalOrgs,
          active: activeOrgs,
          new_this_month: newOrgsThisMonth,
          churned_this_month: churnedOrgsThisMonth,
        },
        revenue: {
          mrr,
          arr,
          monthly_revenue: monthlyRevenue / 100,
          currency: 'EUR',
        },
      },
    });
  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    next(error);
  }
};

module.exports = {
  getDashboard,
};
