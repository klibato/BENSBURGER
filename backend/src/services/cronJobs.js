const cron = require('node-cron');
const { Organization, Subscription, Invoice } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { sendTrialEndingEmail } = require('./emailService');

/**
 * Vérifier les trials qui expirent dans 3 jours et envoyer email
 * Exécuté tous les jours à 9h
 */
const checkTrialsExpiring = cron.schedule('0 9 * * *', async () => {
  try {
    logger.info('Cron job: Checking trials expiring soon...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringOrgs = await Organization.findAll({
      where: {
        trial_ends_at: {
          [Op.lte]: threeDaysFromNow,
          [Op.gte]: new Date(),
        },
        status: 'active',
      },
    });

    for (const org of expiringOrgs) {
      const daysLeft = Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
      await sendTrialEndingEmail(org, daysLeft);
    }

    logger.info(\`Cron job: \${expiringOrgs.length} trial expiring emails sent\`);
  } catch (error) {
    logger.error('Cron job error (checkTrialsExpiring):', error);
  }
}, {
  scheduled: false, // Ne démarre pas automatiquement
});

/**
 * Générer factures mensuelles pour tous les abonnements actifs
 * Exécuté le 1er de chaque mois à 00:00
 */
const generateMonthlyInvoices = cron.schedule('0 0 1 * *', async () => {
  try {
    logger.info('Cron job: Generating monthly invoices...');

    const today = new Date();
    const activeSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        current_period_end: {
          [Op.lte]: today,
        },
      },
      include: [{ model: Organization, as: 'organization' }],
    });

    let invoicesCreated = 0;

    for (const subscription of activeSubscriptions) {
      try {
        // Créer facture
        const invoice = await Invoice.createFromSubscription(subscription, subscription.organization);

        // Mettre à jour période d'abonnement
        subscription.current_period_start = subscription.current_period_end;
        subscription.current_period_end = new Date(subscription.current_period_end);
        subscription.current_period_end.setMonth(subscription.current_period_end.getMonth() + 1);
        await subscription.save();

        invoicesCreated++;
      } catch (error) {
        logger.error(\`Failed to create invoice for subscription \${subscription.id}:\`, error);
      }
    }

    logger.info(\`Cron job: \${invoicesCreated} monthly invoices created\`);
  } catch (error) {
    logger.error('Cron job error (generateMonthlyInvoices):', error);
  }
}, {
  scheduled: false,
});

/**
 * Démarrer tous les cron jobs
 */
const startCronJobs = () => {
  logger.info('Starting cron jobs...');
  checkTrialsExpiring.start();
  generateMonthlyInvoices.start();
  logger.info('Cron jobs started successfully');
};

/**
 * Arrêter tous les cron jobs
 */
const stopCronJobs = () => {
  logger.info('Stopping cron jobs...');
  checkTrialsExpiring.stop();
  generateMonthlyInvoices.stop();
  logger.info('Cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs,
};
