const bcrypt = require('bcryptjs');
const { User } = require('../models');
const logger = require('../utils/logger');

async function seedUsers() {
  try {
    logger.info('🌱 Seeding users...');

    // Vérifier si les utilisateurs existent déjà
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      logger.info(`${existingUsers} utilisateur(s) déjà présent(s). Skip du seeding.`);
      process.exit(0);
      return;
    }

    // Créer uniquement le compte admin avec un PIN sécurisé
    const users = await User.bulkCreate([
      {
        username: 'admin',
        pin_code: '789456', // Sera hashé automatiquement par le hook beforeCreate
        role: 'admin',
        first_name: 'Admin',
        last_name: 'Organisation',
        email: 'admin@organization.local',
        is_active: true,
        organization_id: 1,
      },
    ], {
      individualHooks: true, // Important pour que le hook beforeCreate soit appelé
    });

    logger.info(`✅ ${users.length} utilisateur(s) créé(s) avec succès`);
    logger.info('');
    logger.info('📝 Compte admin disponible :');
    logger.info('  - Username: admin');
    logger.info('  - PIN: 789456');
    logger.info('  - Rôle: Administrateur');
    logger.info('');
    logger.warn('⚠️  IMPORTANT: Changer le PIN en production via l\'interface');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erreur lors du seeding des utilisateurs:', error);
    process.exit(1);
  }
}

// Exécuter le seeding
seedUsers();
