require('dotenv').config();

module.exports = {
  // Environnement
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // Base de données
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'pos_burger',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiration: process.env.JWT_EXPIRATION || '8h',
  },

  // Imprimante
  printer: {
    ip: process.env.PRINTER_IP || '192.168.1.100',
    port: parseInt(process.env.PRINTER_PORT, 10) || 9100,
  },

  // SumUp API
  sumup: {
    apiKey: process.env.SUMUP_API_KEY || '',
  },

  // Configuration app
  app: {
    businessName: 'BensBurger',
    businessAddress: '123 Rue de la Paix, 75001 Paris',
    siret: '12345678901234',
    vatNumber: 'FR12345678901',
  },
};
