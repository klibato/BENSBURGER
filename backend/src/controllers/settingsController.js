const { StoreSettings } = require('../models');
const logger = require('../utils/logger');
const settingsCache = require('../utils/settingsCache');

/**
 * Récupérer les paramètres du commerce
 */
const getSettings = async (req, res, next) => {
  try {
    // MULTI-TENANT: Utiliser req.organization.settings au lieu de StoreSettings
    const settings = req.organization.settings || {};

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des paramètres:', error);
    next(error);
  }
};

/**
 * Mettre à jour les paramètres du commerce
 * Réservé aux administrateurs
 */
const updateSettings = async (req, res, next) => {
  try {
    const {
      store_name,
      store_description,
      address_line1,
      address_line2,
      postal_code,
      city,
      country,
      phone,
      email,
      website,
      legal_form,
      capital_amount,
      siret,
      vat_number,
      rcs,
      currency,
      currency_symbol,
      footer_message,
      categories,
      vat_rates,
      payment_methods,
      logo_url,
      theme_color,
      language,
      timezone,
      sumup_config,
      printer_config,
      email_config,
    } = req.body;

    // MULTI-TENANT: Utiliser req.organization au lieu de StoreSettings
    const updateData = {
      store_name,
      store_description,
      address_line1,
      address_line2,
      postal_code,
      city,
      country,
      phone,
      email,
      website,
      legal_form,
      capital_amount,
      siret,
      vat_number,
      rcs,
      currency,
      currency_symbol,
      footer_message,
      categories,
      vat_rates,
      payment_methods,
      logo_url,
      theme_color,
      language,
      timezone,
      sumup_config,
      printer_config,
      email_config,
    };

    // Supprimer les valeurs undefined pour ne pas écraser avec null
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Mettre à jour les settings de l'organisation
    const currentSettings = req.organization.settings || {};
    const newSettings = { ...currentSettings, ...updateData };

    await req.organization.update({
      settings: newSettings,
    });

    // IMPORTANT: Recharger l'organisation pour avoir les données fraîches
    await req.organization.reload();

    logger.info(`Paramètres du commerce mis à jour par ${req.user.username} (org_id=${req.organizationId})`);

    // Invalider le cache pour que les services rechargent la config
    settingsCache.invalidate();
    logger.info('🔄 Cache des paramètres invalidé');

    res.json({
      success: true,
      data: req.organization.settings,
      message: 'Paramètres mis à jour avec succès',
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des paramètres:', error);
    next(error);
  }
};

/**
 * Récupérer la configuration publique du commerce
 * (catégories, taux TVA, moyens de paiement, thème)
 * Accessible sans authentification
 *
 * MULTI-TENANT: Cette route doit utiliser le middleware tenantIsolation
 * pour détecter l'organisation depuis le subdomain/domain
 */
const getPublicConfig = async (req, res, next) => {
  try {
    // MULTI-TENANT: Utiliser req.organization.settings au lieu de StoreSettings
    const settings = req.organization?.settings || {};

    // Retourner uniquement les informations publiques
    res.json({
      success: true,
      data: {
        categories: settings.categories || [],
        vat_rates: settings.vat_rates || [],
        payment_methods: settings.payment_methods || {},
        theme_color: settings.theme_color || '#FF6B35',
        currency: settings.currency || 'EUR',
        currency_symbol: settings.currency_symbol || '€',
        logo_url: settings.logo_url || null,
        store_name: req.organization?.name || settings.store_name || 'BensBurger',
        language: settings.language || 'fr-FR',
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la configuration publique:', error);
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getPublicConfig,
};
