const axios = require('axios');
const logger = require('../utils/logger');

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@flexpos.app';
const FROM_NAME = process.env.FROM_NAME || 'FlexPOS';

/**
 * Envoyer un email via Brevo
 */
const sendEmail = async ({ to, subject, htmlContent, textContent = null }) => {
  if (!BREVO_API_KEY) {
    logger.warn('Brevo API key not configured. Email not sent.');
    return { success: false, error: 'BREVO_NOT_CONFIGURED' };
  }

  try {
    const response = await axios.post(
      \`\${BREVO_API_URL}/smtp/email\`,
      {
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(\`Email sent to \${to}: \${subject}\`);

    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    logger.error('Brevo send email error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Envoyer email de bienvenue
 */
const sendWelcomeEmail = async (organization) => {
  const htmlContent = \`
    <h1>Bienvenue sur FlexPOS !</h1>
    <p>Bonjour <strong>\${organization.name}</strong>,</p>
    <p>Votre compte FlexPOS a été créé avec succès.</p>
    <p>Vous bénéficiez de 14 jours d'essai gratuit du plan <strong>\${organization.plan}</strong>.</p>
    <p>Connectez-vous dès maintenant : <a href="https://app.flexpos.app">https://app.flexpos.app</a></p>
    <p>Besoin d'aide ? Contactez-nous : support@flexpos.app</p>
  \`;

  return await sendEmail({
    to: organization.email,
    subject: 'Bienvenue sur FlexPOS - Votre essai gratuit a commencé',
    htmlContent,
  });
};

/**
 * Envoyer email de rappel fin de trial
 */
const sendTrialEndingEmail = async (organization, daysLeft) => {
  const htmlContent = \`
    <h1>Votre essai gratuit se termine bientôt</h1>
    <p>Bonjour <strong>\${organization.name}</strong>,</p>
    <p>Il vous reste <strong>\${daysLeft} jours</strong> d'essai gratuit.</p>
    <p>Pour continuer à utiliser FlexPOS, passez à un plan payant.</p>
    <p><a href="https://app.flexpos.app/settings/billing">Gérer mon abonnement</a></p>
  \`;

  return await sendEmail({
    to: organization.email,
    subject: \`Votre essai FlexPOS se termine dans \${daysLeft} jours\`,
    htmlContent,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendTrialEndingEmail,
};
