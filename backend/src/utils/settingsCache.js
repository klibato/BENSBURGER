const StoreSettings = require('../models/StoreSettings');
const logger = require('./logger');

/**
 * Cache des paramètres du commerce
 * Permet aux services (printer, sumup, email) de lire la config depuis la BDD
 * au lieu de process.env
 */
class SettingsCache {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.TTL = 60000; // Cache 60 secondes
  }

  /**
   * Récupérer les paramètres (avec cache)
   */
  async getSettings() {
    const now = Date.now();

    // Si cache valide, retourner le cache
    if (this.cache && this.lastFetch && (now - this.lastFetch < this.TTL)) {
      return this.cache;
    }

    // Sinon, recharger depuis la BDD
    try {
      const settings = await StoreSettings.findOne({
        where: { id: 1 },
      });

      if (!settings) {
        logger.warn('⚠️ Aucun paramètre trouvé, utilisation des valeurs par défaut');
        return this.getDefaultSettings();
      }

      this.cache = settings.toJSON();
      this.lastFetch = now;

      return this.cache;
    } catch (error) {
      logger.error('❌ Erreur lors du chargement des paramètres:', error);

      // En cas d'erreur, utiliser le cache existant ou les défauts
      if (this.cache) {
        logger.warn('⚠️ Utilisation du cache malgré l\'erreur');
        return this.cache;
      }

      return this.getDefaultSettings();
    }
  }

  /**
   * Invalider le cache (forcer le rechargement)
   */
  invalidate() {
    this.cache = null;
    this.lastFetch = null;
    logger.info('🔄 Cache des paramètres invalidé');
  }

  /**
   * Recharger immédiatement
   */
  async refresh() {
    this.invalidate();
    return await this.getSettings();
  }

  /**
   * Valeurs par défaut si aucun paramètre en BDD
   */
  getDefaultSettings() {
    return {
      store_name: 'BensBurger',
      sumup_config: {
        enabled: false,
        api_key: '',
        merchant_code: '',
        affiliate_key: '',
      },
      printer_config: {
        enabled: false,
        type: 'epson',
        interface: 'tcp',
        ip: '',
        port: 9100,
        path: '',
        auto_print: true,
      },
      email_config: {
        enabled: false,
        smtp_host: '',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: '',
        smtp_password: '',
        from_email: '',
        from_name: '',
      },
    };
  }
}

// Singleton
const settingsCache = new SettingsCache();

module.exports = settingsCache;
