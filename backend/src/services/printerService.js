const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const logger = require('../utils/logger');
const { formatPrice } = require('../utils/helpers');
const settingsCache = require('../utils/settingsCache');

/**
 * Service d'impression ESC/POS pour tickets thermiques 80mm
 * Compatible avec imprimantes EPSON, Star, et génériques ESC/POS
 * Lit la configuration depuis la BDD (store_settings.printer_config)
 */

class PrinterService {
  constructor() {
    this.printer = null;
    this.config = null;
  }

  /**
   * Charger la configuration depuis la BDD
   */
  async loadConfig() {
    const settings = await settingsCache.getSettings();
    this.config = settings.printer_config || {
      enabled: false,
      type: 'epson',
      interface: 'tcp',
      ip: '',
      port: 9100,
      path: '',
      auto_print: true,
    };
    return this.config;
  }

  /**
   * Initialiser la connexion à l'imprimante
   */
  async initialize() {
    await this.loadConfig();

    if (!this.config.enabled) {
      logger.info('📄 Imprimante désactivée (config BDD)');
      return false;
    }

    try {
      // Déterminer le type d'imprimante
      let printerType = PrinterTypes.EPSON;
      if (this.config.type === 'star') {
        printerType = PrinterTypes.STAR;
      } else if (this.config.type === 'tanca') {
        printerType = PrinterTypes.TANCA;
      }

      // Configurer l'interface
      const config = {
        type: printerType,
        characterSet: 'PC858_EURO', // Support caractères français + €
        removeSpecialCharacters: false,
        lineCharacter: '-',
        width: 48, // 48 caractères pour imprimante 80mm
      };

      // Ajouter la configuration d'interface
      if (this.config.interface === 'tcp') {
        if (!this.config.ip) {
          logger.warn('⚠️ IP imprimante non définie, impression désactivée');
          this.config.enabled = false;
          return false;
        }
        config.interface = `tcp://${this.config.ip}:${this.config.port}`;
      } else if (this.config.interface === 'usb' || this.config.interface === 'printer') {
        if (!this.config.path) {
          logger.warn('⚠️ Chemin imprimante non défini, impression désactivée');
          this.config.enabled = false;
          return false;
        }
        config.interface = `printer:${this.config.path}`;
      }

      this.printer = new ThermalPrinter(config);

      // Tester la connexion
      const isConnected = await this.testConnection();
      if (isConnected) {
        logger.info(`🖨️ Imprimante initialisée (${this.config.type} via ${this.config.interface})`);
        return true;
      } else {
        logger.warn('⚠️ Impossible de se connecter à l\'imprimante, impression désactivée');
        this.config.enabled = false;
        return false;
      }
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation de l\'imprimante:', error);
      this.config.enabled = false;
      return false;
    }
  }

  /**
   * Tester la connexion à l'imprimante
   */
  async testConnection() {
    if (!this.printer) return false;

    try {
      const result = await this.printer.isPrinterConnected();
      return result;
    } catch (error) {
      logger.error('Erreur test connexion imprimante:', error);
      return false;
    }
  }

  /**
   * Imprimer un ticket de vente
   * @param {Object} sale - Vente avec items et settings
   * @param {Object} settings - Paramètres du commerce
   */
  async printSaleTicket(sale, settings) {
    await this.loadConfig();

    if (!this.config.enabled || !this.printer) {
      logger.info('📄 Impression désactivée ou imprimante non initialisée');
      return { success: false, message: 'Imprimante non disponible' };
    }

    try {
      // Réinitialiser l'imprimante
      this.printer.clear();

      // En-tête du ticket
      this.printer.alignCenter();
      this.printer.setTextDoubleHeight();
      this.printer.bold(true);
      this.printer.println(settings.commerce_name || 'BensBurger');
      this.printer.bold(false);
      this.printer.setTextNormal();
      this.printer.newLine();

      // Informations commerce
      if (settings.address) this.printer.println(settings.address);
      if (settings.postal_code && settings.city) {
        this.printer.println(`${settings.postal_code} ${settings.city}`);
      }
      if (settings.phone) this.printer.println(`Tel: ${settings.phone}`);
      if (settings.siret) this.printer.println(`SIRET: ${settings.siret}`);
      if (settings.vat_number) this.printer.println(`TVA: ${settings.vat_number}`);

      this.printer.drawLine();

      // Numéro de ticket et date
      this.printer.alignLeft();
      this.printer.bold(true);
      this.printer.println(`Ticket N${sale.ticket_number}`);
      this.printer.bold(false);
      this.printer.println(new Date(sale.created_at).toLocaleString('fr-FR'));
      this.printer.println(`Caissier: ${sale.user?.first_name || 'N/A'} ${sale.user?.last_name || ''}`);

      this.printer.drawLine();

      // Articles
      this.printer.alignLeft();
      sale.items.forEach((item) => {
        // Ligne produit : Nom
        this.printer.bold(true);
        this.printer.println(item.product_name);
        this.printer.bold(false);

        // Ligne détails : Qté x Prix = Total
        const line = `  ${item.quantity} x ${formatPrice(item.unit_price_ttc)} = ${formatPrice(item.total_ttc)}`;
        this.printer.println(line);
      });

      this.printer.drawLine();

      // Total HT et TVA
      this.printer.alignLeft();
      this.printer.println(`Total HT:     ${formatPrice(sale.total_ht).padStart(20)}`);

      // Détails TVA
      if (sale.vat_details && Array.isArray(sale.vat_details)) {
        sale.vat_details.forEach((vat) => {
          this.printer.println(
            `TVA ${vat.rate}%:      ${formatPrice(vat.amount_tva).padStart(20)}`
          );
        });
      }

      // Total TTC
      this.printer.newLine();
      this.printer.alignLeft();
      this.printer.setTextDoubleHeight();
      this.printer.bold(true);
      this.printer.println(`TOTAL TTC:    ${formatPrice(sale.total_ttc).padStart(10)}`);
      this.printer.bold(false);
      this.printer.setTextNormal();

      this.printer.drawLine();

      // Mode de paiement
      this.printer.alignLeft();
      const paymentMethodLabels = {
        cash: 'Especes',
        card: 'Carte Bancaire',
        meal_voucher: 'Ticket Restaurant',
        mixed: 'Paiement Mixte',
      };
      this.printer.println(`Paiement: ${paymentMethodLabels[sale.payment_method] || sale.payment_method}`);

      // Détails du paiement
      if (sale.payment_details) {
        if (sale.payment_method === 'cash') {
          this.printer.println(`Recu:         ${formatPrice(sale.payment_details.amount_received)}`);
          this.printer.println(`Rendu:        ${formatPrice(sale.payment_details.change_given)}`);
        } else if (sale.payment_method === 'mixed') {
          if (sale.payment_details.cash) {
            this.printer.println(`  Especes:    ${formatPrice(sale.payment_details.cash)}`);
          }
          if (sale.payment_details.card) {
            this.printer.println(`  Carte:      ${formatPrice(sale.payment_details.card)}`);
          }
          if (sale.payment_details.meal_voucher) {
            this.printer.println(`  TR:         ${formatPrice(sale.payment_details.meal_voucher)}`);
          }
        }
      }

      this.printer.drawLine();

      // Message de fin
      this.printer.alignCenter();
      if (settings.footer_message) {
        this.printer.println(settings.footer_message);
      } else {
        this.printer.println('Merci de votre visite !');
        this.printer.println('A bientot !');
      }

      this.printer.newLine();

      // Détails TVA (légal)
      this.printer.alignLeft();
      this.printer.setTextSize(0, 0); // Petit texte
      if (sale.vat_details && Array.isArray(sale.vat_details)) {
        sale.vat_details.forEach((vat) => {
          this.printer.println(`TVA ${vat.rate}% - Base HT: ${formatPrice(vat.base_ht)} - TVA: ${formatPrice(vat.amount_tva)}`);
        });
      }
      this.printer.setTextNormal();

      // Coupe du papier
      this.printer.newLine();
      this.printer.newLine();
      this.printer.cut();

      // Envoyer à l'imprimante
      await this.printer.execute();

      logger.info(`✅ Ticket N${sale.ticket_number} imprimé avec succès`);
      return { success: true, message: 'Ticket imprimé' };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'impression:', error);
      return { success: false, message: `Erreur d'impression: ${error.message}` };
    }
  }

  /**
   * Imprimer un ticket X (rapport intermédiaire sans clôture)
   * @param {Object} report - Rapport de caisse
   * @param {Object} settings - Paramètres du commerce
   */
  async printXReport(report, settings) {
    await this.loadConfig();

    if (!this.config.enabled || !this.printer) {
      logger.info('📄 Impression désactivée ou imprimante non initialisée');
      return { success: false, message: 'Imprimante non disponible' };
    }

    try {
      this.printer.clear();

      this.printer.alignCenter();
      this.printer.setTextDoubleHeight();
      this.printer.bold(true);
      this.printer.println('TICKET X');
      this.printer.println('RAPPORT INTERMEDIAIRE');
      this.printer.bold(false);
      this.printer.setTextNormal();
      this.printer.newLine();

      this.printer.println(settings.commerce_name || 'BensBurger');
      this.printer.drawLine();

      this.printer.alignLeft();
      this.printer.println(`Date: ${new Date().toLocaleString('fr-FR')}`);
      this.printer.println(`Caissier: ${report.cashier_name || 'N/A'}`);
      this.printer.drawLine();

      this.printer.bold(true);
      this.printer.println('VENTES');
      this.printer.bold(false);
      this.printer.println(`Nombre de tickets: ${report.ticket_count || 0}`);
      this.printer.println(`Total ventes TTC:  ${formatPrice(report.total_sales || 0)}`);
      this.printer.newLine();

      this.printer.bold(true);
      this.printer.println('MOYENS DE PAIEMENT');
      this.printer.bold(false);
      this.printer.println(`Especes:           ${formatPrice(report.total_cash || 0)}`);
      this.printer.println(`Carte:             ${formatPrice(report.total_card || 0)}`);
      this.printer.println(`Ticket Restaurant: ${formatPrice(report.total_meal_voucher || 0)}`);

      this.printer.drawLine();
      this.printer.alignCenter();
      this.printer.println('Rapport non fiscal');
      this.printer.println('Caisse toujours ouverte');

      this.printer.newLine();
      this.printer.newLine();
      this.printer.cut();

      await this.printer.execute();

      logger.info('✅ Ticket X imprimé avec succès');
      return { success: true, message: 'Ticket X imprimé' };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'impression du ticket X:', error);
      return { success: false, message: `Erreur d'impression: ${error.message}` };
    }
  }

  /**
   * Imprimer un ticket Z (rapport de clôture)
   * @param {Object} cashRegister - Caisse avec rapport de clôture
   * @param {Object} settings - Paramètres du commerce
   */
  async printZReport(cashRegister, settings) {
    await this.loadConfig();

    if (!this.config.enabled || !this.printer) {
      logger.info('📄 Impression désactivée ou imprimante non initialisée');
      return { success: false, message: 'Imprimante non disponible' };
    }

    try {
      this.printer.clear();

      this.printer.alignCenter();
      this.printer.setTextDoubleHeight();
      this.printer.bold(true);
      this.printer.println('TICKET Z');
      this.printer.println('CLOTURE DE CAISSE');
      this.printer.bold(false);
      this.printer.setTextNormal();
      this.printer.newLine();

      this.printer.println(settings.commerce_name || 'BensBurger');
      this.printer.drawLine();

      this.printer.alignLeft();
      this.printer.println(`Ouverture: ${new Date(cashRegister.opened_at).toLocaleString('fr-FR')}`);
      this.printer.println(`Cloture:   ${new Date(cashRegister.closed_at).toLocaleString('fr-FR')}`);
      this.printer.println(`Caissier: ${cashRegister.user?.first_name || 'N/A'} ${cashRegister.user?.last_name || ''}`);
      this.printer.drawLine();

      this.printer.bold(true);
      this.printer.println('VENTES');
      this.printer.bold(false);
      this.printer.println(`Nombre de tickets: ${cashRegister.ticket_count || 0}`);
      this.printer.println(`Total ventes TTC:  ${formatPrice(cashRegister.total_sales || 0)}`);
      this.printer.newLine();

      this.printer.bold(true);
      this.printer.println('MOYENS DE PAIEMENT');
      this.printer.bold(false);
      this.printer.println(`Especes:           ${formatPrice(cashRegister.total_cash || 0)}`);
      this.printer.println(`Carte:             ${formatPrice(cashRegister.total_card || 0)}`);
      this.printer.println(`Ticket Restaurant: ${formatPrice(cashRegister.total_meal_voucher || 0)}`);

      this.printer.drawLine();

      this.printer.bold(true);
      this.printer.println('CAISSE');
      this.printer.bold(false);
      this.printer.println(`Fond de caisse:    ${formatPrice(cashRegister.opening_balance || 0)}`);
      this.printer.println(`Especes attendues: ${formatPrice(cashRegister.expected_cash || 0)}`);
      this.printer.println(`Especes comptees:  ${formatPrice(cashRegister.actual_cash || 0)}`);

      const diff = parseFloat(cashRegister.cash_difference || 0);
      this.printer.newLine();
      if (diff !== 0) {
        this.printer.bold(true);
        this.printer.println(`Ecart:             ${formatPrice(diff)}`);
        this.printer.bold(false);
      } else {
        this.printer.println('Ecart:             0.00 EUR (OK)');
      }

      this.printer.drawLine();
      this.printer.alignCenter();
      this.printer.println('Caisse clôturée');
      this.printer.println('Rapport fiscal');

      this.printer.newLine();
      this.printer.newLine();
      this.printer.cut();

      await this.printer.execute();

      logger.info('✅ Ticket Z imprimé avec succès');
      return { success: true, message: 'Ticket Z imprimé' };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'impression du ticket Z:', error);
      return { success: false, message: `Erreur d'impression: ${error.message}` };
    }
  }

  /**
   * Imprimer un ticket de test
   */
  async printTestTicket() {
    await this.loadConfig();

    if (!this.config.enabled || !this.printer) {
      return { success: false, message: 'Imprimante non disponible' };
    }

    try {
      this.printer.clear();
      this.printer.alignCenter();
      this.printer.setTextDoubleHeight();
      this.printer.bold(true);
      this.printer.println('TEST IMPRIMANTE');
      this.printer.bold(false);
      this.printer.setTextNormal();
      this.printer.newLine();
      this.printer.println('BensBurger POS');
      this.printer.println(new Date().toLocaleString('fr-FR'));
      this.printer.newLine();
      this.printer.println('Imprimante fonctionnelle !');
      this.printer.newLine();
      this.printer.newLine();
      this.printer.cut();

      await this.printer.execute();

      logger.info('✅ Ticket de test imprimé');
      return { success: true, message: 'Test réussi' };
    } catch (error) {
      logger.error('❌ Erreur lors du test d\'impression:', error);
      return { success: false, message: `Erreur: ${error.message}` };
    }
  }
}

// Singleton
const printerService = new PrinterService();

module.exports = printerService;
