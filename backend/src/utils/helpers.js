/**
 * Utilitaires et helpers
 */

const crypto = require('crypto');

/**
 * Formater un montant en euros avec 2 décimales
 * @param {number|string} amount - Montant à formater
 * @returns {string} - Montant formaté (ex: "12.50 EUR")
 */
const formatPrice = (amount) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '0.00 EUR';
  }

  return `${numAmount.toFixed(2)} EUR`;
};

/**
 * Formater une date en français
 * @param {Date|string} date - Date à formater
 * @returns {string} - Date formatée (ex: "10/01/2025 14:30")
 */
const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Date invalide';
  }

  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Générer un numéro de ticket séquentiel
 * Format: YYYYMMDD-XXXX (ex: 20250110-0001)
 * @param {number} count - Compteur séquentiel du jour
 * @returns {string} - Numéro de ticket
 */
const generateTicketNumber = (count) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(count).padStart(4, '0');

  return `${year}${month}${day}-${sequence}`;
};

/**
 * Valider un code PIN
 * @param {string} pin - Code PIN à valider
 * @returns {boolean} - Valide ou non
 */
const isValidPin = (pin) => {
  return /^\d{4,6}$/.test(pin);
};

/**
 * Calculer un hash SHA-256 (pour NF525)
 * @param {string} data - Données à hasher
 * @returns {string} - Hash en hexadécimal
 */
const hashSHA256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Arrondir un montant à 2 décimales
 * @param {number} amount - Montant
 * @returns {number} - Montant arrondi
 */
const roundAmount = (amount) => {
  return Math.round(amount * 100) / 100;
};

module.exports = {
  formatPrice,
  formatDate,
  generateTicketNumber,
  isValidPin,
  hashSHA256,
  roundAmount,
};
