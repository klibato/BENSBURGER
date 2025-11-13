const axios = require('axios');
const logger = require('../utils/logger');
const settingsCache = require('../utils/settingsCache');

/**
 * Service d'intégration SumUp pour paiements par carte
 *
 * SumUp API Documentation: https://developer.sumup.com/
 *
 * Fonctionnalités:
 * - Créer un checkout (paiement)
 * - Vérifier le statut d'un paiement
 * - Annuler un paiement
 *
 * Configuration:
 * Lit depuis store_settings.sumup_config (BDD)
 */

class SumUpService {
  constructor() {
    this.config = null;
    this.baseURL = 'https://api.sumup.com/v0.1';
  }

  /**
   * Charger la configuration depuis la BDD
   */
  async loadConfig() {
    const settings = await settingsCache.getSettings();
    this.config = settings.sumup_config || {
      enabled: false,
      api_key: '',
      merchant_code: '',
      affiliate_key: '',
    };
    return this.config;
  }

  /**
   * Vérifier que SumUp est configuré
   */
  async isConfigured() {
    await this.loadConfig();

    if (!this.config.enabled) {
      logger.info('💳 SumUp désactivé (config BDD)');
      return false;
    }

    if (!this.config.api_key || !this.config.merchant_code) {
      logger.warn('⚠️ Configuration SumUp incomplète (api_key ou merchant_code manquant)');
      return false;
    }

    return true;
  }

  /**
   * Créer un checkout SumUp
   *
   * @param {Object} options - Options du checkout
   * @param {number} options.amount - Montant en euros (avec décimales)
   * @param {string} options.currency - Devise (EUR)
   * @param {string} options.reference - Référence unique (ticket_number)
   * @param {string} options.description - Description du paiement
   * @returns {Promise<Object>} - Résultat avec checkout_id et status
   */
  async createCheckout({ amount, currency = 'EUR', reference, description }) {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'SumUp n\'est pas configuré',
      };
    }

    try {
      // Convertir le montant en centimes (SumUp API attend les montants en centimes)
      const amountInCents = Math.round(parseFloat(amount) * 100);

      const payload = {
        checkout_reference: reference,
        amount: amountInCents / 100, // SumUp API accepts decimal amounts
        currency,
        merchant_code: this.config.merchant_code,
        description: description || `Ticket ${reference}`,
      };

      logger.info(`📡 Création checkout SumUp: ${reference} - ${amount}€`);

      const checkoutURL = `${this.baseURL}/checkouts`;
      const response = await axios.post(checkoutURL, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 secondes
      });

      if (response.data && response.data.id) {
        logger.info(`✅ Checkout SumUp créé: ${response.data.id}`);
        return {
          success: true,
          checkout_id: response.data.id,
          status: response.data.status,
          amount: response.data.amount,
          date: response.data.date,
        };
      } else {
        throw new Error('Réponse SumUp invalide');
      }
    } catch (error) {
      logger.error('❌ Erreur création checkout SumUp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erreur de connexion SumUp',
      };
    }
  }

  /**
   * Vérifier le statut d'un checkout
   *
   * @param {string} checkoutId - ID du checkout SumUp
   * @returns {Promise<Object>} - Statut du paiement
   */
  async getCheckoutStatus(checkoutId) {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'SumUp n\'est pas configuré',
      };
    }

    try {
      const checkoutURL = `${this.baseURL}/checkouts`;
      const response = await axios.get(`${checkoutURL}/${checkoutId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        timeout: 5000,
      });

      const { status, amount, currency, date, transactions } = response.data;

      return {
        success: true,
        status, // PENDING, PAID, FAILED, CANCELLED
        amount,
        currency,
        date,
        transactions,
      };
    } catch (error) {
      logger.error('❌ Erreur vérification statut SumUp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Traiter un paiement SumUp (pour intégration avec terminal physique)
   *
   * Cette méthode est un placeholder pour l'intégration avec un terminal SumUp physique.
   * En production, cela nécessiterait l'utilisation du SDK SumUp Air/Solo.
   *
   * @param {Object} options - Options du paiement
   * @param {number} options.amount - Montant
   * @param {string} options.reference - Référence unique
   * @returns {Promise<Object>} - Résultat du paiement
   */
  async processPayment({ amount, reference }) {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'SumUp n\'est pas configuré',
      };
    }

    // Pour le MVP, on simule un paiement réussi si SumUp est configuré
    // En production, cela communiquerait avec le terminal SumUp via leur SDK
    logger.info(`💳 Traitement paiement SumUp: ${reference} - ${amount}€`);

    try {
      // Créer le checkout
      const checkout = await this.createCheckout({
        amount,
        reference,
        description: `BensBurger - Ticket ${reference}`,
      });

      if (!checkout.success) {
        throw new Error(checkout.error);
      }

      // Simuler un délai de traitement (terminal SumUp)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // En production, on attendrait ici la confirmation du terminal
      // Pour le MVP, on considère le paiement comme réussi
      logger.info(`✅ Paiement SumUp réussi: ${checkout.checkout_id}`);

      return {
        success: true,
        checkout_id: checkout.checkout_id,
        transaction_id: checkout.checkout_id, // Utilisé comme transaction_id pour le MVP
        amount,
        status: 'PAID',
        message: 'Paiement SumUp accepté',
      };
    } catch (error) {
      logger.error('❌ Erreur traitement paiement SumUp:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du paiement SumUp',
      };
    }
  }

  /**
   * Obtenir les informations du compte marchand
   * (utile pour vérifier la configuration)
   */
  async getMerchantInfo() {
    const configured = await this.isConfigured();
    if (!configured) {
      return {
        success: false,
        error: 'SumUp n\'est pas configuré',
      };
    }

    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        timeout: 5000,
      });

      logger.info('✅ Informations marchand SumUp récupérées');
      return {
        success: true,
        merchant: response.data,
      };
    } catch (error) {
      logger.error('❌ Erreur récupération infos marchand:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Tester la connexion à SumUp
   */
  async testConnection() {
    logger.info('🔍 Test de connexion SumUp...');

    if (!this.isConfigured()) {
      logger.warn('⚠️ SumUp non configuré');
      return false;
    }

    const result = await this.getMerchantInfo();

    if (result.success) {
      logger.info(`✅ Connexion SumUp OK - Marchand: ${result.merchant?.merchant_profile?.business_name || 'N/A'}`);
      return true;
    } else {
      logger.error(`❌ Connexion SumUp échouée: ${result.error}`);
      return false;
    }
  }
}

// Singleton
const sumupService = new SumUpService();

module.exports = sumupService;
