const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Initialiser Sentry pour monitoring erreurs production
 */
function initSentry(app) {
  if (config.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    logger.info('Sentry disabled (not in production or no DSN)');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.NODE_ENV,
    release: `flexpos-backend@${process.env.npm_package_version || '1.0.0'}`,

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% des requêtes
    profilesSampleRate: 0.1, // 10% profiling

    // Integrations
    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],

    // Filtrer les informations sensibles
    beforeSend(event, hint) {
      // Retirer les données sensibles des erreurs
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }

      // Ne pas envoyer les erreurs de validation (400)
      if (hint?.originalException?.statusCode === 400) {
        return null;
      }

      return event;
    },

    // Ignorer certaines erreurs
    ignoreErrors: [
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'TOKEN_EXPIRED',
      'NOT_FOUND',
    ],
  });

  logger.info('Sentry initialized successfully');
}

/**
 * Middleware Sentry pour Express
 */
function getSentryMiddlewares() {
  if (config.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    // Middlewares vides si Sentry désactivé
    return {
      requestHandler: (req, res, next) => next(),
      tracingHandler: (req, res, next) => next(),
      errorHandler: (err, req, res, next) => next(err),
    };
  }

  return {
    requestHandler: Sentry.Handlers.requestHandler(),
    tracingHandler: Sentry.Handlers.tracingHandler(),
    errorHandler: Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capturer toutes les erreurs 500+
        return error.status >= 500;
      },
    }),
  };
}

/**
 * Capturer une exception manuellement
 */
function captureException(error, context = {}) {
  if (config.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capturer un message manuel
 */
function captureMessage(message, level = 'info', context = {}) {
  if (config.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Définir le contexte utilisateur
 */
function setUser(user) {
  if (config.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    username: user.username,
    email: user.email,
    organization_id: user.organization_id,
  });
}

module.exports = {
  initSentry,
  getSentryMiddlewares,
  captureException,
  captureMessage,
  setUser,
  Sentry,
};
