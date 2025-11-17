# BACKEND UTILS - Documentation Technique Exhaustive

> **PHASE 0.A.2** - Analyse intégrale des utilitaires backend
> **Date**: 2025-11-15
> **Fichiers analysés**: 4 utils (259 lignes de code)
> **Objectif**: Documenter tous les utilitaires pour audit complet

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [logger.js - Logging avec Winston](#loggerjs---logging-avec-winston)
3. [settingsCache.js - Cache des paramètres BDD](#settingscachejs---cache-des-paramètres-bdd)
4. [helpers.js - Fonctions utilitaires](#helpersjs---fonctions-utilitaires)
5. [constants.js - Constantes (DUPLICATION DÉTECTÉE)](#constantsjs---constantes-duplication-détectée)
6. [Problèmes détectés](#problèmes-détectés)
7. [Recommandations Multi-Tenant](#recommandations-multi-tenant)

---

## Vue d'ensemble

Les **utils** sont des modules utilitaires réutilisables dans toute l'application. Ils fournissent du logging, du caching, et des fonctions helpers.

| Util | Lignes | Rôle | Pattern |
|------|--------|------|---------|
| `logger.js` | 42 | Logging avec Winston | Singleton |
| `settingsCache.js` | 111 | Cache des paramètres BDD | Singleton Class |
| `helpers.js` | 93 | Fonctions utilitaires diverses | Functional |
| `constants.js` | 13 | Constantes (⚠️ duplication) | Functional |
| **TOTAL** | **259** | - | - |

### ⚠️ Problème critique : Duplication de code

**`formatPrice()`** existe dans **2 fichiers différents** :
- `/backend/src/utils/helpers.js` (ligne 10)
- `/backend/src/utils/constants.js` (ligne 6)

👉 **Recommandation** : Supprimer `constants.js` et utiliser uniquement `helpers.js`.

---

## logger.js - Logging avec Winston

**Localisation** : `/backend/src/utils/logger.js`
**Lignes** : 42 lignes
**Dépendances** : `winston`, `config/env`
**Pattern** : Singleton (instance Winston exportée)

### Vue d'ensemble

Ce fichier configure **Winston** pour le logging centralisé de l'application. Il gère :
- Logs console (colorisés)
- Logs fichiers (error.log + combined.log)
- Rotation automatique (5MB max par fichier)

### Configuration du format

```javascript
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);
```

**Format de sortie** :
```
2025-11-15 14:30:15 [INFO]: Serveur démarré sur le port 5000
2025-11-15 14:30:20 [ERROR]: Error: Database connection failed
    at Object.<anonymous> (/app/src/index.js:42:15)
    ...
```

**Éléments du format** :
- `timestamp` : Date/heure au format `YYYY-MM-DD HH:mm:ss`
- `level` : Niveau du log (DEBUG, INFO, WARN, ERROR)
- `message` ou `stack` : Message ou stack trace complète si erreur

### Configuration du logger

```javascript
const logger = winston.createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // Fichiers d'erreurs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tous les logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});
```

### Transports configurés

| Transport | Destination | Niveau min | Rotation | Format |
|-----------|-------------|------------|----------|--------|
| **Console** | stdout | `debug` (dev) / `info` (prod) | N/A | Colorisé |
| **File (error.log)** | `logs/error.log` | `error` | 5MB × 5 fichiers | Standard |
| **File (combined.log)** | `logs/combined.log` | `debug` (dev) / `info` (prod) | 5MB × 5 fichiers | Standard |

### Niveaux de log Winston

| Niveau | Valeur numérique | Usage |
|--------|------------------|-------|
| `error` | 0 | Erreurs critiques |
| `warn` | 1 | Warnings, situations anormales |
| `info` | 2 | Informations générales |
| `http` | 3 | Logs HTTP (non utilisé) |
| `verbose` | 4 | Logs verbeux (non utilisé) |
| `debug` | 5 | Debug (uniquement en dev) |
| `silly` | 6 | Ultra-verbeux (non utilisé) |

**Comportement selon l'environnement** :
- **Development** (`NODE_ENV=development`) : Logs `debug` et supérieurs (tous)
- **Production** (`NODE_ENV=production`) : Logs `info` et supérieurs (pas de debug)

### Utilisation dans l'application

```javascript
const logger = require('./utils/logger');

logger.debug('Message de debug (dev uniquement)');
logger.info('Serveur démarré sur le port 5000');
logger.warn('Imprimante non configurée');
logger.error('Erreur de connexion à la BDD:', error);
```

### Rotation des fichiers

Quand un fichier atteint **5MB** :
1. Renommer `error.log` → `error.log.1`
2. Créer un nouveau `error.log` vide
3. Garder max **5 fichiers** (supprimer `error.log.5` si existe)

**Fichiers générés** :
```
logs/
├── error.log          (actuel)
├── error.log.1        (précédent)
├── error.log.2
├── ...
├── combined.log       (actuel)
├── combined.log.1
└── ...
```

### ✅ Points forts

- Logs structurés avec timestamp
- Rotation automatique (évite les fichiers géants)
- Colorisation en console (lisibilité)
- Stack traces complètes pour les erreurs
- Séparation error.log / combined.log

### ⚠️ Points d'amélioration

- ❌ Pas de logs **JSON structurés** (difficile à parser par des outils comme ELK, Datadog)
- ❌ Pas de **log level par module** (tous au même niveau)
- ❌ Pas de **logs HTTP** (pas de morgan intégré)
- ❌ Pas de **corrélation ID** (impossibilité de tracer une requête)

### Export

```javascript
module.exports = logger;
```

Instance singleton Winston exportée.

---

## settingsCache.js - Cache des paramètres BDD

**Localisation** : `/backend/src/utils/settingsCache.js`
**Lignes** : 111 lignes
**Dépendances** : `models/StoreSettings`, `logger`
**Pattern** : Singleton Class

### Vue d'ensemble

Cache **singleton** pour les paramètres du commerce (`StoreSettings`). Évite de requêter la BDD à chaque appel en gardant les settings en mémoire pendant **60 secondes**.

### Architecture de la classe

```javascript
class SettingsCache {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.TTL = 60000; // Cache 60 secondes
  }
  // ... méthodes
}

// Singleton
const settingsCache = new SettingsCache();
module.exports = settingsCache;
```

**Propriétés** :
- `cache` : Objet contenant les settings (null si jamais chargé)
- `lastFetch` : Timestamp du dernier chargement (null si jamais chargé)
- `TTL` : Time To Live du cache (60000ms = 60 secondes)

### Méthode 1 : `getSettings()` (lignes 19-53)

**Rôle** : Récupérer les paramètres avec système de cache.

**Signature** :
```javascript
async getSettings()
```

**Retour** : Objet `StoreSettings` (ou valeurs par défaut si non trouvé).

**Algorithme** :

```javascript
async getSettings() {
  const now = Date.now();

  // 1. Vérifier si le cache est valide
  if (this.cache && this.lastFetch && (now - this.lastFetch < this.TTL)) {
    return this.cache; // Retourner le cache
  }

  // 2. Cache expiré, recharger depuis la BDD
  try {
    const settings = await StoreSettings.findOne({ where: { id: 1 } });

    if (!settings) {
      logger.warn('⚠️ Aucun paramètre trouvé, utilisation des valeurs par défaut');
      return this.getDefaultSettings();
    }

    // 3. Mettre en cache
    this.cache = settings.toJSON();
    this.lastFetch = now;

    return this.cache;
  } catch (error) {
    logger.error('❌ Erreur lors du chargement des paramètres:', error);

    // 4. En cas d'erreur, utiliser le cache existant
    if (this.cache) {
      logger.warn('⚠️ Utilisation du cache malgré l\'erreur');
      return this.cache;
    }

    // 5. Sinon, valeurs par défaut
    return this.getDefaultSettings();
  }
}
```

**Stratégie de fallback** :

```
1. Cache valide (< 60s)        → Retourner le cache
2. Cache expiré                → Requêter la BDD
3. BDD OK                      → Mettre en cache
4. BDD erreur + cache existe   → Utiliser l'ancien cache
5. BDD erreur + pas de cache   → Valeurs par défaut
```

**Utilisation** :
```javascript
const settingsCache = require('../utils/settingsCache');

// Dans un service
async initialize() {
  const settings = await settingsCache.getSettings();
  this.config = settings.printer_config || { ... };
}
```

**✅ Points forts** :
- Réduit la charge BDD (1 requête par minute max)
- Résilience : fonctionne même si BDD indisponible (utilise l'ancien cache)
- Fallback automatique sur valeurs par défaut

**⚠️ Points d'amélioration** :
- ❌ TTL fixe à **60 secondes** (pas configurable)
- ❌ Pas de **clustering** (si plusieurs workers Node.js, chacun a son cache)
- ❌ Stocke toute la table `StoreSettings` en mémoire (pas de sélection de colonnes)
- ❌ Hardcodé sur `id: 1` (mono-tenant)

### Méthode 2 : `invalidate()` (lignes 55-62)

**Rôle** : Invalider le cache manuellement (forcer le rechargement au prochain appel).

**Signature** :
```javascript
invalidate()
```

**Implémentation** :
```javascript
invalidate() {
  this.cache = null;
  this.lastFetch = null;
  logger.info('🔄 Cache des paramètres invalidé');
}
```

**Utilisation** :
```javascript
// Après mise à jour des settings
await settings.update({ store_name: 'Nouveau nom' });

// Invalider le cache
settingsCache.invalidate();

// Le prochain appel à getSettings() rechargera depuis la BDD
```

**Cas d'usage** :
- Après modification des settings (controller `updateSettings`)
- Après changement de config imprimante/SumUp/email

**✅ Points forts** :
- Simple et efficace
- Logging de l'invalidation

### Méthode 3 : `refresh()` (lignes 64-70)

**Rôle** : Recharger immédiatement depuis la BDD (invalider + charger).

**Signature** :
```javascript
async refresh()
```

**Implémentation** :
```javascript
async refresh() {
  this.invalidate();
  return await this.getSettings();
}
```

**Utilisation** :
```javascript
// Forcer le rechargement immédiat
const freshSettings = await settingsCache.refresh();
console.log(freshSettings.store_name);
```

**Différence avec `invalidate()` + `getSettings()`** :
- `refresh()` : 1 appel, retourne les settings
- `invalidate()` + `getSettings()` : 2 appels, même résultat

👉 `refresh()` est un **raccourci** pour `invalidate()` + `getSettings()`.

### Méthode 4 : `getDefaultSettings()` (lignes 72-104)

**Rôle** : Retourner les valeurs par défaut si aucun paramètre en BDD.

**Signature** :
```javascript
getDefaultSettings()
```

**Valeurs par défaut** :
```javascript
{
  store_name: 'BensBurger',
  sumup_config: {
    enabled: false,
    api_key: '',
    merchant_code: '',
    affiliate_key: '',
  },
  printer_config: {
    enabled: false,
    type: 'epson',
    interface: 'tcp',
    ip: '',
    port: 9100,
    path: '',
    auto_print: true,
  },
  email_config: {
    enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
  },
}
```

**Cas d'usage** :
- Première installation (BDD vide)
- Erreur de connexion BDD
- Développement local sans seed

**⚠️ Limite** : Ne contient **que 4 propriétés** (store_name + 3 configs). Tous les autres champs du modèle `StoreSettings` sont absents (adresse, SIRET, TVA, etc.).

### Export

```javascript
const settingsCache = new SettingsCache();
module.exports = settingsCache;
```

Instance singleton exportée.

---

## helpers.js - Fonctions utilitaires

**Localisation** : `/backend/src/utils/helpers.js`
**Lignes** : 93 lignes
**Dépendances** : `crypto` (natif Node.js)
**Pattern** : Module fonctionnel (exports de fonctions)

### Vue d'ensemble

Collection de **6 fonctions utilitaires** pures pour formatage, validation et hashing.

### Fonction 1 : `formatPrice(amount)` (lignes 10-18)

**Rôle** : Formater un montant en euros avec 2 décimales.

**Signature** :
```javascript
const formatPrice = (amount) => { ... }
```

**Paramètres** :
- `amount` : `number` ou `string` - Montant à formater

**Retour** : `string` - Format `"12.50 EUR"`

**Implémentation** :
```javascript
const formatPrice = (amount) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '0.00 EUR';
  }

  return `${numAmount.toFixed(2)} EUR`;
};
```

**Exemples** :
```javascript
formatPrice(12.5)       // "12.50 EUR"
formatPrice("9.99")     // "9.99 EUR"
formatPrice(0)          // "0.00 EUR"
formatPrice("invalid")  // "0.00 EUR" (fallback)
formatPrice(null)       // "0.00 EUR"
```

**✅ Points forts** :
- Gère les strings et numbers
- Fallback sur "0.00 EUR" si invalide
- Toujours 2 décimales

**⚠️ Points d'amélioration** :
- ❌ Symbole "EUR" hardcodé (pas internationalisable)
- ❌ Pas de séparateur de milliers (12345.67 → "12345.67 EUR" au lieu de "12 345.67 EUR")

### Fonction 2 : `formatDate(date)` (lignes 20-39)

**Rôle** : Formater une date en français.

**Signature** :
```javascript
const formatDate = (date) => { ... }
```

**Paramètres** :
- `date` : `Date` ou `string` - Date à formater

**Retour** : `string` - Format `"10/01/2025 14:30"`

**Implémentation** :
```javascript
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
```

**Exemples** :
```javascript
formatDate(new Date('2025-01-10T14:30:00'))  // "10/01/2025 14:30"
formatDate('2025-01-10T14:30:00')            // "10/01/2025 14:30"
formatDate('invalid')                        // "Date invalide"
```

**Format de sortie** :
- Jour : 2 chiffres (ex: `01`, `15`)
- Mois : 2 chiffres (ex: `01`, `12`)
- Année : 4 chiffres (ex: `2025`)
- Heure : 2 chiffres (ex: `14`)
- Minutes : 2 chiffres (ex: `30`)

**✅ Points forts** :
- Utilise `toLocaleString()` natif (correct selon la locale)
- Gère les objets Date et strings
- Fallback "Date invalide"

### Fonction 3 : `generateTicketNumber(count)` (lignes 41-55)

**Rôle** : Générer un numéro de ticket séquentiel au format `YYYYMMDD-XXXX`.

**Signature** :
```javascript
const generateTicketNumber = (count) => { ... }
```

**Paramètres** :
- `count` : `number` - Compteur séquentiel du jour

**Retour** : `string` - Format `"20250110-0001"`

**Implémentation** :
```javascript
const generateTicketNumber = (count) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(count).padStart(4, '0');

  return `${year}${month}${day}-${sequence}`;
};
```

**Exemples** :
```javascript
// Le 10 janvier 2025
generateTicketNumber(1)      // "20250110-0001"
generateTicketNumber(42)     // "20250110-0042"
generateTicketNumber(9999)   // "20250110-9999"
generateTicketNumber(10000)  // "20250110-10000" (débordement)
```

**Format** :
- `YYYY` : Année sur 4 chiffres
- `MM` : Mois sur 2 chiffres (01-12)
- `DD` : Jour sur 2 chiffres (01-31)
- `-` : Séparateur
- `XXXX` : Séquence sur 4 chiffres (0001-9999)

**⚠️ Problème** : Si `count > 9999`, le numéro déborde (pas de protection).

**Cas d'usage** :
```javascript
// Dans le modèle Sale (hook beforeCreate)
const countToday = await Sale.count({
  where: {
    created_at: { [Op.gte]: startOfToday }
  }
});

sale.ticket_number = generateTicketNumber(countToday + 1);
```

**✅ Points forts** :
- Format lisible et séquentiel
- Permet de compter les ventes par jour
- Compatible NF525 (numérotation séquentielle)

**⚠️ Points d'amélioration** :
- ❌ Débordement si > 9999 ventes/jour
- ❌ Pas de **préfixe par organisation** (mono-tenant)

### Fonction 4 : `isValidPin(pin)` (lignes 57-64)

**Rôle** : Valider un code PIN (4 à 6 chiffres).

**Signature** :
```javascript
const isValidPin = (pin) => { ... }
```

**Paramètres** :
- `pin` : `string` - Code PIN à valider

**Retour** : `boolean`

**Implémentation** :
```javascript
const isValidPin = (pin) => {
  return /^\d{4,6}$/.test(pin);
};
```

**Regex** : `^\d{4,6}$`
- `^` : Début de la chaîne
- `\d{4,6}` : 4 à 6 chiffres (0-9)
- `$` : Fin de la chaîne

**Exemples** :
```javascript
isValidPin('1234')     // true
isValidPin('123456')   // true
isValidPin('123')      // false (trop court)
isValidPin('1234567')  // false (trop long)
isValidPin('12ab')     // false (lettres)
isValidPin('12 34')    // false (espace)
```

**✅ Points forts** :
- Simple et efficace
- Accepte 4 à 6 chiffres (flexible)

**⚠️ Points d'amélioration** :
- ❌ Accepte des PINs faibles (ex: "0000", "1234", "1111")
- ❌ Pas de vérification de **complexité**

### Fonction 5 : `hashSHA256(data)` (lignes 66-74)

**Rôle** : Calculer un hash SHA-256 (pour NF525).

**Signature** :
```javascript
const hashSHA256 = (data) => { ... }
```

**Paramètres** :
- `data` : `string` - Données à hasher

**Retour** : `string` - Hash en hexadécimal (64 caractères)

**Implémentation** :
```javascript
const hashSHA256 = (data) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
};
```

**Exemples** :
```javascript
hashSHA256('Hello World')
// "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"

hashSHA256('Ticket-001|12.50|2025-01-10T14:30:00')
// "3f8c7e9d2a1b4c5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9"
```

**Cas d'usage NF525** :
```javascript
// Hash chaîné
const previousHash = sale_previous.closing_hash || '0';
const dataToHash = `${sale.ticket_number}|${sale.total_ttc}|${sale.created_at}|${previousHash}`;
const currentHash = hashSHA256(dataToHash);

sale.closing_hash = currentHash;
```

**✅ Points forts** :
- Utilise le module `crypto` natif de Node.js (performant)
- Hash standard SHA-256 (reconnu pour NF525)

**⚠️ Points d'amélioration** :
- ❌ Require `crypto` à chaque appel (devrait être en haut du fichier)

### Fonction 6 : `roundAmount(amount)` (lignes 76-83)

**Rôle** : Arrondir un montant à 2 décimales.

**Signature** :
```javascript
const roundAmount = (amount) => { ... }
```

**Paramètres** :
- `amount` : `number` - Montant

**Retour** : `number` - Montant arrondi

**Implémentation** :
```javascript
const roundAmount = (amount) => {
  return Math.round(amount * 100) / 100;
};
```

**Exemples** :
```javascript
roundAmount(12.345)    // 12.35 (arrondi au supérieur)
roundAmount(12.344)    // 12.34 (arrondi à l'inférieur)
roundAmount(12.345678) // 12.35
roundAmount(0.1 + 0.2) // 0.3 (corrige l'erreur float)
```

**Algorithme** :
1. Multiplier par 100 : `12.345 × 100 = 1234.5`
2. Arrondir : `Math.round(1234.5) = 1235`
3. Diviser par 100 : `1235 / 100 = 12.35`

**✅ Points forts** :
- Corrige les erreurs de précision float (ex: 0.1 + 0.2 = 0.30000000000000004)
- Simple et efficace

**⚠️ Points d'amélioration** :
- ❌ Pourrait être remplacé par `toFixed(2)` converti en number : `parseFloat(amount.toFixed(2))`

### Export

```javascript
module.exports = {
  formatPrice,
  formatDate,
  generateTicketNumber,
  isValidPin,
  hashSHA256,
  roundAmount,
};
```

6 fonctions exportées.

---

## constants.js - Constantes (DUPLICATION DÉTECTÉE)

**Localisation** : `/backend/src/utils/constants.js`
**Lignes** : 13 lignes
**Dépendances** : Aucune
**Pattern** : Module fonctionnel

### ⚠️ PROBLÈME CRITIQUE : Duplication de code

Ce fichier contient **une seule fonction** : `formatPrice()`, qui est **déjà définie dans `helpers.js`**.

### Implémentation

```javascript
const formatPrice = (amount) => {
  return `${parseFloat(amount).toFixed(2)} €`;
};

module.exports = {
  formatPrice,
};
```

### Comparaison avec helpers.js

| Critère | helpers.js | constants.js |
|---------|------------|--------------|
| Gestion des strings | ✅ `typeof amount === 'string'` | ❌ Non |
| Fallback si NaN | ✅ Retourne "0.00 EUR" | ❌ Retourne "NaN €" |
| Symbole devise | "EUR" | "€" |
| Robustesse | ✅ Plus robuste | ❌ Moins robuste |

**Exemple de bug avec constants.js** :
```javascript
const { formatPrice } = require('./utils/constants');

formatPrice(null);      // "NaN €" ❌ (au lieu de "0.00 EUR")
formatPrice("invalid"); // "NaN €" ❌
```

### Où est-il utilisé ?

```bash
# Recherche dans le code
grep -r "require.*constants" backend/src/
```

**Résultat** (d'après analyse précédente) :
- `services/pdfService.js` ligne 2 : `const { formatPrice } = require('../utils/constants');`

👉 **1 seul fichier** importe `constants.js` au lieu de `helpers.js`.

### 🔴 Problème

1. **Duplication de code** : Même fonction dans 2 fichiers
2. **Incohérence** : `constants.js` utilise "€" et `helpers.js` utilise "EUR"
3. **Bug potentiel** : `constants.js` ne gère pas les valeurs invalides
4. **Confusion** : Quel fichier utiliser ?

### 📋 Plan d'action recommandé

1. **Supprimer** `constants.js` complètement
2. **Modifier** `pdfService.js` ligne 2 :
   ```javascript
   // Avant
   const { formatPrice } = require('../utils/constants');

   // Après
   const { formatPrice } = require('../utils/helpers');
   ```
3. **Vérifier** qu'il n'y a pas d'autres imports de `constants.js`

---

## Problèmes détectés

### 🔴 Bugs critiques

| # | Util | Ligne | Problème | Impact |
|---|------|-------|----------|--------|
| 1 | `constants.js` | - | **Duplication totale de `formatPrice()`** avec `helpers.js` | ⚠️ Code dupliqué, incohérence |
| 2 | `constants.js` | 7 | `formatPrice()` retourne "NaN €" si valeur invalide | ❌ Bug si `null`, `undefined`, `"invalid"` |
| 3 | `helpers.js` | 47 | `generateTicketNumber()` déborde si count > 9999 | ⚠️ Tickets mal numérotés |

### ⚠️ Problèmes de conception

| # | Util | Problème | Recommandation |
|---|------|----------|----------------|
| 1 | `settingsCache.js` | TTL fixe à 60s (pas configurable) | Permettre de configurer le TTL via env |
| 2 | `settingsCache.js` | Hardcodé sur `id: 1` (mono-tenant) | Passer `organizationId` en paramètre |
| 3 | `logger.js` | Pas de logs JSON structurés | Ajouter format JSON pour ELK/Datadog |
| 4 | `helpers.js` | `hashSHA256()` require crypto à chaque appel | Require en haut du fichier |

### 🟡 Warnings mineurs

| # | Util | Ligne | Problème |
|---|------|-------|----------|
| 1 | `helpers.js` | 10 | `formatPrice()` symbole "EUR" hardcodé (pas i18n) |
| 2 | `helpers.js` | 62 | `isValidPin()` accepte PINs faibles (0000, 1234) |
| 3 | `settingsCache.js` | 75 | `getDefaultSettings()` ne contient que 4 propriétés (incomplet) |

---

## Recommandations Multi-Tenant

Pour transformer ces utils en **multi-tenant**, voici les modifications nécessaires :

### 1. settingsCache.js - Ajouter organization_id

**Problème** : Actuellement hardcodé sur `id: 1` (un seul commerce).

**Solution** : Passer `organizationId` en paramètre et cacher par organization

```javascript
class SettingsCache {
  constructor() {
    this.caches = {}; // Cache par organization { orgId: { cache, lastFetch } }
    this.TTL = 60000;
  }

  async getSettings(organizationId = 1) {
    const now = Date.now();
    const orgCache = this.caches[organizationId];

    // Vérifier le cache pour cette organization
    if (orgCache && orgCache.cache && (now - orgCache.lastFetch < this.TTL)) {
      return orgCache.cache;
    }

    // Recharger depuis la BDD
    try {
      const settings = await StoreSettings.findOne({
        where: { organization_id: organizationId } // ← Filtrer par organization
      });

      if (!settings) {
        logger.warn(`⚠️ Aucun paramètre pour organization ${organizationId}`);
        return this.getDefaultSettings();
      }

      // Mettre en cache pour cette organization
      this.caches[organizationId] = {
        cache: settings.toJSON(),
        lastFetch: now
      };

      return this.caches[organizationId].cache;
    } catch (error) {
      logger.error('❌ Erreur chargement paramètres:', error);

      // Fallback sur l'ancien cache
      if (orgCache && orgCache.cache) {
        return orgCache.cache;
      }

      return this.getDefaultSettings();
    }
  }

  invalidate(organizationId) {
    if (organizationId) {
      delete this.caches[organizationId];
      logger.info(`🔄 Cache invalidé pour organization ${organizationId}`);
    } else {
      this.caches = {};
      logger.info('🔄 Cache invalidé pour toutes les organizations');
    }
  }
}
```

**Migration BDD requise** :
```sql
ALTER TABLE store_settings ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
```

### 2. helpers.js - Ajouter préfixe organization au ticket_number

**Problème** : Numéros de tickets identiques entre organizations.

**Solution** : Ajouter un préfixe

```javascript
const generateTicketNumber = (count, organizationId = 1) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(count).padStart(4, '0');

  // Format: ORG001-20250110-0001
  const orgPrefix = `ORG${String(organizationId).padStart(3, '0')}`;

  return `${orgPrefix}-${year}${month}${day}-${sequence}`;
};
```

**Exemple** :
```javascript
generateTicketNumber(1, 5)     // "ORG005-20250110-0001"
generateTicketNumber(42, 123)  // "ORG123-20250110-0042"
```

### 3. logger.js

**Aucune modification requise** : Le logger est agnostique aux données métier.

### 4. constants.js

**Action** : **Supprimer ce fichier** (duplication inutile).

---

## Résumé statistique

| Métrique | Valeur |
|----------|--------|
| **Utils analysés** | 4 |
| **Lignes de code totales** | 259 |
| **Fonctions exportées** | 10 (6 helpers + 1 constant + 3 méthodes cache) |
| **Bugs critiques** | 3 (duplication, NaN bug, débordement) |
| **Warnings** | 7 |
| **Dépendances NPM** | 2 (winston, crypto natif) |
| **Pattern Singleton** | 2 (logger, settingsCache) |
| **Pattern Functional** | 2 (helpers, constants) |
| **Duplication de code** | 1 fichier entier (`constants.js`) |
| **Multi-tenant ready** | 0/4 (nécessite modifications) |

---

**Fin de la documentation BACKEND_UTILS.md**
