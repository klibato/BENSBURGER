/**
 * Configuration globale pour les tests Jest
 */

// Désactiver les logs pendant les tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Timeout global pour les tests
jest.setTimeout(10000);

// Configuration de l'environnement de test
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'pos_burger_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRATION = '8h';

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});
