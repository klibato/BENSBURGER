/**
 * Service de calcul de TVA et totaux
 */

/**
 * Calculer le prix TTC à partir du prix HT et du taux de TVA
 * @param {number} priceHT - Prix HT
 * @param {number} vatRate - Taux de TVA (ex: 10.0 pour 10%)
 * @returns {number} Prix TTC
 */
const calculateTTC = (priceHT, vatRate) => {
  return parseFloat((priceHT * (1 + vatRate / 100)).toFixed(2));
};

/**
 * Calculer le montant de TVA
 * @param {number} priceHT - Prix HT
 * @param {number} vatRate - Taux de TVA
 * @returns {number} Montant de TVA
 */
const calculateVATAmount = (priceHT, vatRate) => {
  return parseFloat((priceHT * (vatRate / 100)).toFixed(2));
};

/**
 * Calculer les totaux d'une ligne de vente
 * @param {number} quantity - Quantité
 * @param {number} unitPriceHT - Prix unitaire HT
 * @param {number} vatRate - Taux de TVA
 * @param {number} discountAmount - Montant de remise (optionnel)
 * @returns {object} { totalHT, totalTTC, vatAmount }
 */
const calculateLineTotal = (quantity, unitPriceHT, vatRate, discountAmount = 0) => {
  const totalHT = parseFloat(((quantity * unitPriceHT) - discountAmount).toFixed(2));
  const vatAmount = calculateVATAmount(totalHT, vatRate);
  const totalTTC = parseFloat((totalHT + vatAmount).toFixed(2));

  return {
    totalHT,
    totalTTC,
    vatAmount,
  };
};

/**
 * Calculer le récapitulatif TVA d'une vente (groupé par taux)
 * @param {Array} items - Items de la vente [{totalHT, vatRate, totalTTC}]
 * @returns {object} Récapitulatif TVA par taux
 * Exemple: { "10.0": { base_ht: 100, amount_vat: 10, total_ttc: 110 } }
 */
const calculateVATDetails = (items) => {
  const vatDetails = {};

  items.forEach((item) => {
    const rate = parseFloat(item.vat_rate).toFixed(1);

    if (!vatDetails[rate]) {
      vatDetails[rate] = {
        base_ht: 0,
        amount_vat: 0,
        total_ttc: 0,
      };
    }

    const totalHT = parseFloat(item.total_ht);
    const totalTTC = parseFloat(item.total_ttc);
    const vatAmount = totalTTC - totalHT;

    vatDetails[rate].base_ht = parseFloat((vatDetails[rate].base_ht + totalHT).toFixed(2));
    vatDetails[rate].amount_vat = parseFloat((vatDetails[rate].amount_vat + vatAmount).toFixed(2));
    vatDetails[rate].total_ttc = parseFloat((vatDetails[rate].total_ttc + totalTTC).toFixed(2));
  });

  return vatDetails;
};

/**
 * Calculer les totaux globaux d'une vente
 * @param {Array} items - Items de la vente
 * @returns {object} { totalHT, totalTTC, vatDetails }
 */
const calculateSaleTotals = (items) => {
  const totalHT = items.reduce((sum, item) => sum + parseFloat(item.total_ht), 0);
  const totalTTC = items.reduce((sum, item) => sum + parseFloat(item.total_ttc), 0);
  const vatDetails = calculateVATDetails(items);

  return {
    totalHT: parseFloat(totalHT.toFixed(2)),
    totalTTC: parseFloat(totalTTC.toFixed(2)),
    vatDetails,
  };
};

/**
 * Calculer la monnaie à rendre
 * @param {number} totalTTC - Total TTC à payer
 * @param {number} amountPaid - Montant payé
 * @returns {number} Monnaie à rendre
 */
const calculateChange = (totalTTC, amountPaid) => {
  return parseFloat((amountPaid - totalTTC).toFixed(2));
};

module.exports = {
  calculateTTC,
  calculateVATAmount,
  calculateLineTotal,
  calculateVATDetails,
  calculateSaleTotals,
  calculateChange,
};
