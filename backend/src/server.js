const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const { testConnection } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Initialiser les models (pour établir les relations)
require('./models');

// Créer l'application Express
const app = express();

// Trust proxy (PRODUCTION: Caddy reverse proxy envoie X-Forwarded-For)
// Requis pour express-rate-limit et CORS en production
app.set('trust proxy', true);

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// Sécurité - Helmet avec CSP désactivée (gérée par Caddy)
app.use(helmet({
  contentSecurityPolicy: false, // CSP gérée par Caddy (reverse proxy)
}));

// CORS
app.use(cors({
  origin: config.NODE_ENV === 'production'
    ? [
        'https://app.flexpos.app',      // POS Application
        'https://admin.flexpos.app',    // Admin Dashboard
        'https://www.flexpos.app',      // Landing Page
        'https://flexpos.app'           // Landing sans www
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser (NF525: Pour lire les cookies httpOnly sécurisés)
app.use(cookieParser());

// Rate limiting (plus strict pour l'auth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
    },
  },
  validate: { trustProxy: false }, // Désactiver validation trust proxy (reverse proxy Caddy)
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de requêtes, ralentissez',
    },
  },
  validate: { trustProxy: false }, // Désactiver validation trust proxy (reverse proxy Caddy)
});

// Logger des requêtes en dev
if (config.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes API (Public - Inscription sans authentification)
app.use('/api/public', apiLimiter, require('./routes/public'));

// Routes API (POS)
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations')); // MULTI-TENANT: Gestion des organisations
app.use('/api/products', apiLimiter, require('./routes/products'));
app.use('/api/sales', apiLimiter, require('./routes/sales'));
app.use('/api/cash-registers', apiLimiter, require('./routes/cashRegisters'));
app.use('/api/dashboard', apiLimiter, require('./routes/dashboard'));
app.use('/api/users', apiLimiter, require('./routes/users'));
app.use('/api/settings', apiLimiter, require('./routes/settings'));
app.use('/api/printer', apiLimiter, require('./routes/printer'));
app.use('/api/logs', apiLimiter, require('./routes/logs'));
app.use('/api/nf525', apiLimiter, require('./routes/nf525')); // NF525: Conformité fiscale française

// Routes API (Admin - Super-Admin Dashboard)
app.use('/api/admin', apiLimiter, require('./routes/admin'));

// ============================================
// GESTION DES ERREURS
// ============================================

// 404
app.use(notFoundHandler);

// Erreurs globales
app.use(errorHandler);

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Impossible de démarrer le serveur sans connexion à la base de données');
      process.exit(1);
    }

    // Exécuter toutes les migrations SQL automatiquement
    const migrateAllSQL = require('./scripts/migrateAllSQL');
    await migrateAllSQL();

    // Initialiser l'imprimante thermique
    const printerService = require('./services/printerService');
    await printerService.initialize();

    // Démarrer les cron jobs (SaaS: Facturation & Trials)
    if (config.NODE_ENV === 'production') {
      const { startCronJobs } = require('./services/cronJobs');
      startCronJobs();
      logger.info('✅ Cron jobs SaaS démarrés (facturation, trials)');
    }

    // Démarrer le serveur
    app.listen(config.PORT, () => {
      logger.info(`🚀 Serveur démarré sur le port ${config.PORT}`);
      logger.info(`📝 Environnement: ${config.NODE_ENV}`);
      logger.info(`🔗 API disponible sur: http://localhost:${config.PORT}`);
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Démarrer le serveur
startServer();

module.exports = app;
