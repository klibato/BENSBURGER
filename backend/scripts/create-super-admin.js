const { AdminUser } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function createSuperAdmin() {
  try {
    // Se connecter à la BDD
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');

    // Vérifier si un super admin existe déjà
    const existingAdmin = await AdminUser.findOne({ where: { role: 'super_admin' } });
    if (existingAdmin) {
      console.log('⚠️  Un super-admin existe déjà:', existingAdmin.email);
      console.log('Email:', existingAdmin.email);
      console.log('Username:', existingAdmin.username);
      process.exit(0);
    }

    // Créer le super admin
    const superAdmin = await AdminUser.createAdmin({
      email: 'admin@flexpos.app',
      username: 'superadmin',
      password: 'FlexPOS2024!', // Mot de passe temporaire
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      permissions: ['*'], // Toutes les permissions
      is_active: true,
      email_verified: true, // Vérifié directement
    });

    console.log('\n🎉 Super-admin créé avec succès!\n');
    console.log('📧 Email:', superAdmin.email);
    console.log('👤 Username:', superAdmin.username);
    console.log('🔑 Mot de passe:', 'FlexPOS2024!');
    console.log('\n⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!\n');
    console.log('🌐 URL:', 'https://admin.flexpos.app/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création du super-admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
