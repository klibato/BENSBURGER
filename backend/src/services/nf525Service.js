const crypto = require('crypto');
const { HashChain, Sale, NF525Archive } = require('../models');
const logger = require('../utils/logger');

/**
 * Service NF525 - Conformité Anti-Fraude TVA
 * Implémente hash chaîné SHA-256 conforme décret n°2016-1551
 *
 * Loi: n°2015-1785 du 29 décembre 2015
 * Décret: n°2016-1551 du 17 novembre 2016
 * Obligation: 1er janvier 2026
 *
 * Fonctionnalités:
 * - Hash SHA-256 chaîné pour chaque vente
 * - Vérification intégrité complète
 * - Génération archives certifiées
 * - Export audit fiscal
 */
class NF525Service {
  /**
   * Génère hash SHA-256 pour une vente
   * Format strict: SHA256(org_id|sale_id|total_ttc|total_ht|timestamp|payment_method|items_json|previous_hash)
   *
   * ⚠️ ORDRE DES DONNÉES CRITIQUE - Ne jamais modifier!
   * Toute modification de l'ordre brise le chaînage historique
   *
   * @param {Object} sale - Objet Sale Sequelize (avec items chargés)
   * @param {String|null} previousHash - Hash précédent (null pour première vente)
   * @returns {String} Hash SHA-256 (64 caractères hex lowercase)
   */
  static generateSaleHash(sale, previousHash = null) {
    try {
      // Validation entrée
      if (!sale || !sale.id || !sale.organization_id) {
        throw new Error('Invalid sale object: missing required fields');
      }

      // Données à hasher (ordre STRICT, immuable)
      const dataArray = [
        String(sale.organization_id), // Entier → String
        String(sale.id), // UUID
        parseFloat(sale.total_ttc).toFixed(2), // Float → String 2 décimales
        parseFloat(sale.total_ht).toFixed(2), // Float → String 2 décimales
        new Date(sale.created_at).toISOString(), // Date → ISO 8601
        String(sale.payment_method || 'unknown'), // String (cash/card/mixed)
        JSON.stringify(sale.items || []), // Array → JSON string
        previousHash || '0'.repeat(64), // Genesis hash: 64 zéros si première vente
      ];

      const dataToHash = dataArray.join('|');

      // Hash SHA-256
      const hash = crypto.createHash('sha256').update(dataToHash, 'utf8').digest('hex');

      // Log pour debug (raccourci hash)
      if (logger && logger.info) {
        logger.info(
          `NF525: Hash généré pour vente #${sale.id} ` +
            `(org: ${sale.organization_id}, seq: TBD) → ${hash.substring(0, 16)}...`
        );
      }

      return hash;
    } catch (error) {
      if (logger && logger.error) {
        logger.error('❌ NF525: Erreur generateSaleHash:', error);
      }
      throw new Error(`Failed to generate NF525 hash: ${error.message}`);
    }
  }

  /**
   * Crée entrée hash chain pour une vente
   * DOIT être appelé dans la même transaction que la création de la vente (atomicité)
   *
   * Workflow:
   * 1. Lock pessimiste sur dernier hash (éviter race conditions)
   * 2. Récupérer previous_hash
   * 3. Calculer current_hash
   * 4. Insérer dans hash_chain (trigger auto-increment sequence_number)
   *
   * @param {Object} sale - Vente Sequelize (avec items chargés)
   * @param {Transaction} transaction - Transaction Sequelize OBLIGATOIRE
   * @returns {Promise<Object>} HashChain créé
   */
  static async createHashChainEntry(sale, transaction = null) {
    try {
      // Validation transaction (CRITIQUE pour atomicité)
      if (!transaction) {
        throw new Error(
          'Transaction required for createHashChainEntry. ' +
            'Hash chain must be created atomically with sale to prevent data inconsistency.'
        );
      }

      // Validation sale
      if (!sale || !sale.id || !sale.organization_id) {
        throw new Error('Invalid sale object: missing id or organization_id');
      }

      // 1. Récupérer dernier hash de l'organisation (avec lock pessimiste)
      const lastHash = await HashChain.findOne({
        where: { organization_id: sale.organization_id },
        order: [['sequence_number', 'DESC']],
        lock: transaction.LOCK.UPDATE, // Lock pessimiste PostgreSQL
        transaction,
      });

      const previousHash = lastHash ? lastHash.current_hash : null;
      const nextSequenceNumber = lastHash ? lastHash.sequence_number + 1 : 1;

      if (logger && logger.info) {
        logger.info(
          `NF525: Création hash #${nextSequenceNumber} pour org ${sale.organization_id} ` +
            `(vente #${sale.id})`
        );
      }

      // 2. Générer hash actuel
      const currentHash = this.generateSaleHash(sale, previousHash);

      // 3. Créer entrée HashChain
      // Note: sequence_number sera auto-incrémenté par trigger PostgreSQL
      // On passe quand même la valeur calculée pour validation
      const hashEntry = await HashChain.create(
        {
          organization_id: sale.organization_id,
          sale_id: sale.id,
          sequence_number: nextSequenceNumber, // Validé par trigger
          current_hash: currentHash,
          previous_hash: previousHash,
          certified_timestamp: new Date(),
        },
        { transaction }
      );

      if (logger && logger.info) {
        logger.info(
          `✅ NF525: Hash #${hashEntry.sequence_number} créé avec succès ` +
            `(hash: ${currentHash.substring(0, 16)}...)`
        );
      }

      return hashEntry;
    } catch (error) {
      if (logger && logger.error) {
        logger.error('❌ NF525: Erreur createHashChainEntry:', error);
      }
      throw new Error(`Failed to create NF525 hash chain: ${error.message}`);
    }
  }

  /**
   * Vérifie intégrité complète de la chaîne de hash
   * Parcourt TOUS les hash d'une organisation et vérifie:
   * 1. Séquence continue (1, 2, 3, ... N)
   * 2. previous_hash correspond au current_hash précédent
   * 3. Recalcul hash à partir des données vente (détection altération)
   *
   * ⚠️ ATTENTION: Opération coûteuse sur grandes bases (>10,000 ventes)
   * Utiliser avec pagination ou en asynchrone
   *
   * @param {Number} organizationId - ID organisation
   * @param {Object} options - Options (limit, offset pour pagination)
   * @returns {Promise<Object>} { valid, brokenAt, totalChecked, message, details }
   */
  static async verifyHashChainIntegrity(organizationId, options = {}) {
    try {
      if (logger && logger.info) {
        logger.info(
          `🔍 NF525: Vérification intégrité chaîne org ${organizationId} ` +
            `(options: ${JSON.stringify(options)})`
        );
      }

      // Options pagination
      const limit = options.limit || null;
      const offset = options.offset || 0;

      // Récupérer toute la chaîne (ou portion si pagination)
      const queryOptions = {
        where: { organization_id: organizationId },
        include: [
          {
            model: Sale,
            as: 'sale',
            required: true,
            attributes: [
              'id',
              'organization_id',
              'total_ttc',
              'total_ht',
              'created_at',
              'payment_method',
              'items',
            ],
          },
        ],
        order: [['sequence_number', 'ASC']],
      };

      if (limit) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
      }

      const hashChain = await HashChain.findAll(queryOptions);

      if (hashChain.length === 0) {
        return {
          valid: true,
          brokenAt: null,
          totalChecked: 0,
          message: 'No sales yet - hash chain empty',
          details: [],
        };
      }

      if (logger && logger.info) {
        logger.info(`🔍 NF525: Vérification de ${hashChain.length} entrées...`);
      }

      const details = [];

      // Vérifier chaque maillon
      for (let i = 0; i < hashChain.length; i++) {
        const current = hashChain[i];
        const sequenceCheck = {
          sequence: current.sequence_number,
          checks: [],
        };

        // CHECK 1: Vérifier previous_hash correct
        const expectedPrevious = i === 0 ? null : hashChain[i - 1].current_hash;

        if (current.previous_hash !== expectedPrevious) {
          const error = {
            check: 'previous_hash',
            expected: expectedPrevious?.substring(0, 16) + '...' || 'null',
            got: current.previous_hash?.substring(0, 16) + '...' || 'null',
            status: 'FAIL',
          };
          sequenceCheck.checks.push(error);

          if (logger && logger.error) {
            logger.error(
              `❌ NF525: Chaîne brisée à séquence ${current.sequence_number} ` +
                `(previous_hash mismatch)`
            );
          }

          details.push(sequenceCheck);

          return {
            valid: false,
            brokenAt: current.sequence_number,
            totalChecked: i + 1,
            message: `Hash chain broken at sequence ${current.sequence_number}: previous_hash mismatch`,
            details,
          };
        }
        sequenceCheck.checks.push({ check: 'previous_hash', status: 'OK' });

        // CHECK 2: Recalculer hash et comparer
        const recalculatedHash = this.generateSaleHash(current.sale, current.previous_hash);

        if (recalculatedHash !== current.current_hash) {
          const error = {
            check: 'current_hash',
            expected: recalculatedHash.substring(0, 16) + '...',
            got: current.current_hash.substring(0, 16) + '...',
            status: 'FAIL',
          };
          sequenceCheck.checks.push(error);

          if (logger && logger.error) {
            logger.error(
              `❌ NF525: Données altérées à séquence ${current.sequence_number} ` +
                `(hash mismatch)`
            );
          }

          details.push(sequenceCheck);

          return {
            valid: false,
            brokenAt: current.sequence_number,
            totalChecked: i + 1,
            message: `Data tampering detected at sequence ${current.sequence_number}: hash mismatch`,
            details,
          };
        }
        sequenceCheck.checks.push({ check: 'current_hash', status: 'OK' });

        // CHECK 3: Vérifier séquence continue
        const expectedSequence = offset + i + 1; // Tenir compte offset pagination
        if (current.sequence_number !== expectedSequence) {
          const error = {
            check: 'sequence_number',
            expected: expectedSequence,
            got: current.sequence_number,
            status: 'FAIL',
          };
          sequenceCheck.checks.push(error);

          if (logger && logger.error) {
            logger.error(
              `❌ NF525: Séquence incorrecte à position ${i}: ` +
                `attendu ${expectedSequence}, reçu ${current.sequence_number}`
            );
          }

          details.push(sequenceCheck);

          return {
            valid: false,
            brokenAt: current.sequence_number,
            totalChecked: i + 1,
            message: `Sequence error at position ${i}: expected ${expectedSequence}, got ${current.sequence_number}`,
            details,
          };
        }
        sequenceCheck.checks.push({ check: 'sequence_number', status: 'OK' });

        details.push(sequenceCheck);
      }

      if (logger && logger.info) {
        logger.info(`✅ NF525: Intégrité vérifiée - ${hashChain.length} entrées valides`);
      }

      return {
        valid: true,
        brokenAt: null,
        totalChecked: hashChain.length,
        message: `Hash chain integrity verified: ${hashChain.length} entries checked successfully`,
        details,
      };
    } catch (error) {
      if (logger && logger.error) {
        logger.error('❌ NF525: Erreur verifyHashChainIntegrity:', error);
      }
      throw new Error(`Failed to verify hash chain integrity: ${error.message}`);
    }
  }

  /**
   * Récupère statistiques NF525 pour une organisation
   * Utilisé pour dashboard admin
   *
   * @param {Number} organizationId
   * @returns {Promise<Object>} Statistiques complètes
   */
  static async getOrganizationNF525Stats(organizationId) {
    try {
      // Stats hash chain
      const totalHashes = await HashChain.count({
        where: { organization_id: organizationId },
      });

      const lastHash = await HashChain.findOne({
        where: { organization_id: organizationId },
        order: [['sequence_number', 'DESC']],
        attributes: ['sequence_number', 'current_hash', 'certified_timestamp'],
      });

      const firstHash = await HashChain.findOne({
        where: { organization_id: organizationId },
        order: [['sequence_number', 'ASC']],
        attributes: ['sequence_number', 'certified_timestamp'],
      });

      // Stats archives
      const archiveStats = await NF525Archive.getStats(organizationId);

      // Vérifier intégrité (sample rapide: juste 10 dernières ventes)
      let integrityStatus = 'unknown';
      try {
        const integrityCheck = await this.verifyHashChainIntegrity(organizationId, {
          limit: 10,
          offset: Math.max(0, totalHashes - 10),
        });
        integrityStatus = integrityCheck.valid ? 'valid' : 'broken';
      } catch (error) {
        if (logger && logger.warn) {
          logger.warn('NF525: Impossible de vérifier intégrité:', error.message);
        }
        integrityStatus = 'error';
      }

      return {
        hash_chain: {
          total_entries: totalHashes,
          first_sale_date: firstHash?.certified_timestamp || null,
          last_sale_date: lastHash?.certified_timestamp || null,
          current_sequence_number: lastHash?.sequence_number || 0,
          last_hash: lastHash?.current_hash || null,
          integrity_status: integrityStatus,
        },
        archives: archiveStats,
      };
    } catch (error) {
      if (logger && logger.error) {
        logger.error('❌ NF525: Erreur getOrganizationNF525Stats:', error);
      }
      throw error;
    }
  }

  /**
   * Exporte données NF525 pour audit fiscal
   * Format CSV compatible administration fiscale
   *
   * @param {Number} organizationId
   * @param {Object} filters - Filtres (date_start, date_end, etc.)
   * @returns {Promise<String>} CSV data
   */
  static async exportAuditCSV(organizationId, filters = {}) {
    try {
      // WHERE clause
      const where = { organization_id: organizationId };

      if (filters.date_start) {
        where.certified_timestamp = {
          ...where.certified_timestamp,
          [require('sequelize').Op.gte]: new Date(filters.date_start),
        };
      }

      if (filters.date_end) {
        where.certified_timestamp = {
          ...where.certified_timestamp,
          [require('sequelize').Op.lte]: new Date(filters.date_end),
        };
      }

      // Récupérer données
      const hashChainData = await HashChain.findAll({
        where,
        include: [
          {
            model: Sale,
            as: 'sale',
            required: true,
          },
        ],
        order: [['sequence_number', 'ASC']],
      });

      // Générer CSV
      const csvHeaders = [
        'sequence_number',
        'sale_id',
        'ticket_number',
        'sale_date',
        'total_ht',
        'total_ttc',
        'payment_method',
        'current_hash',
        'previous_hash',
        'certified_timestamp',
      ].join(';');

      const csvRows = hashChainData.map((entry) => {
        return [
          entry.sequence_number,
          entry.sale_id,
          entry.sale?.ticket_number || '',
          entry.sale?.created_at?.toISOString() || '',
          entry.sale?.total_ht || 0,
          entry.sale?.total_ttc || 0,
          entry.sale?.payment_method || '',
          entry.current_hash,
          entry.previous_hash || '',
          entry.certified_timestamp.toISOString(),
        ].join(';');
      });

      return csvHeaders + '\n' + csvRows.join('\n');
    } catch (error) {
      if (logger && logger.error) {
        logger.error('❌ NF525: Erreur exportAuditCSV:', error);
      }
      throw new Error(`Failed to export audit CSV: ${error.message}`);
    }
  }
}

module.exports = NF525Service;
