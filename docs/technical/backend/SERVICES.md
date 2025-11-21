# BACKEND SERVICES - Documentation Technique Exhaustive

> **PHASE 0.A.2** - Analyse intégrale des services métier backend
> **Date**: 2025-11-15
> **Fichiers analysés**: 4 services (1,119 lignes de code)
> **Objectif**: Documenter tous les services métier pour audit complet

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [pdfService.js - Génération de tickets PDF](#pdfservicejs---génération-de-tickets-pdf)
3. [printerService.js - Impression thermique ESC/POS](#printerservicejs---impression-thermique-escpos)
4. [sumupService.js - Intégration paiement SumUp](#sumupservicejs---intégration-paiement-sumup)
5. [vatService.js - Calculs de TVA](#vatservicejs---calculs-de-tva)
6. [Problèmes détectés](#problèmes-détectés)
7. [Recommandations Multi-Tenant](#recommandations-multi-tenant)
8. [Recommandations NF525](#recommandations-nf525)

---

## Vue d'ensemble

Les **services** sont des modules métier réutilisables qui encapsulent la logique complexe hors des controllers :

| Service | Lignes | Rôle | Pattern | Dépendances |
|---------|--------|------|---------|-------------|
| `pdfService.js` | 259 | Génération PDF tickets | Functional | pdfkit, constants |
| `printerService.js` | 462 | Impression thermique 80mm | Singleton Class | node-thermal-printer, settingsCache |
| `sumupService.js` | 286 | Intégration API SumUp | Singleton Class | axios, settingsCache |
| `vatService.js` | 112 | Calculs TVA et totaux | Functional | Aucune |
| **TOTAL** | **1,119** | - | - | - |

### Patterns observés

1. **Singleton Pattern** : `printerService` et `sumupService` sont instanciés une seule fois
2. **Functional Pattern** : `pdfService` et `vatService` exposent des fonctions pures
3. **Configuration dynamique** : Utilisation de `settingsCache` pour lire la config BDD
4. **Gestion d'erreurs** : Try/catch systématiques avec logging via `logger`

---

## pdfService.js - Génération de tickets PDF

**Localisation** : `/backend/src/services/pdfService.js`
**Lignes** : 259 lignes
**Dépendances** : `pdfkit`, `constants.formatPrice`
**Pattern** : Module fonctionnel (exports de fonctions)

### Vue d'ensemble

Ce service génère des **tickets de caisse PDF** conformes aux normes françaises de facturation. Le format est **80mm de largeur** (ticket thermique) avec une hauteur variable.

### Fonction principale : `generateTicketPDF()`

```javascript
const generateTicketPDF = (sale, cashRegister, user, settings) => {
  const doc = new PDFDocument({
    size: [226.77, 841.89], // 80mm de largeur (ticket thermique)
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
  });
  // ...
  return doc;
};
```

**Paramètres** :
- `sale` : Vente complète avec items (objet Sale)
- `cashRegister` : Caisse associée (objet CashRegister)
- `user` : Utilisateur ayant fait la vente (objet User)
- `settings` : Paramètres du commerce (objet StoreSettings)

**Retour** : Instance `PDFDocument` (stream)

### Structure du ticket généré

Le ticket est divisé en 8 sections :

#### 1. En-tête - Informations commerce (lignes 38-61)
```javascript
doc.fontSize(20).font('Helvetica-Bold');
centerText(settings.store_name || 'FlexPOS', doc.y);

// Adresse, téléphone, etc.
if (settings.address_line1) centerText(settings.address_line1, doc.y + 12);
if (settings.phone) centerText(`Tél: ${settings.phone}`, doc.y + 36);
```

**Données affichées** :
- Nom du commerce (settings.store_name)
- Description (settings.store_description)
- Adresse complète (address_line1, address_line2, postal_code, city)
- Téléphone (settings.phone)

#### 2. Informations du ticket (lignes 72-80)
```javascript
doc.text(`Ticket N°: ${sale.ticket_number}`, 20);
doc.text(`Date: ${new Date(sale.created_at).toLocaleString('fr-FR')}`, 20);
doc.text(`Caisse: ${cashRegister.register_name}`, 20);
doc.text(`Caissier: ${user.first_name} ${user.last_name}`, 20);
```

**Données affichées** :
- Numéro de ticket unique (sale.ticket_number)
- Date/heure de vente (sale.created_at)
- Nom de la caisse (cashRegister.register_name)
- Nom complet du caissier (user.first_name + last_name)

#### 3. Liste des articles (lignes 92-127)
```javascript
sale.items.forEach((item) => {
  // Nom produit + quantité (aligné à gauche)
  doc.text(`${item.quantity}x ${item.product_name}`, 20, doc.y,
    { width: contentWidth * 0.7, align: 'left' });

  // Prix total ligne (aligné à droite)
  const lineTotal = formatPrice(item.total_ttc);
  doc.text(lineTotal, 20 + contentWidth * 0.7, doc.y - 10,
    { width: contentWidth * 0.3, align: 'right' });

  // Prix unitaire si quantité > 1
  if (item.quantity > 1) {
    doc.text(`  (${formatPrice(item.unit_price_ht)} HT × ${item.quantity})`, 20, doc.y);
  }
});
```

**Format par article** :
```
2x Burger Classic                    18.00€
  (9.00€ HT × 2)
```

#### 4. Détail TVA par taux (lignes 139-161)
```javascript
if (sale.vat_details && Object.keys(sale.vat_details).length > 0) {
  Object.entries(sale.vat_details).forEach(([rate, details]) => {
    lineText(`TVA ${rate}%`, `${formatPrice(details.base_ht)} HT`, doc.y);
    lineText(`  Montant TVA`, `${formatPrice(details.amount_vat)}`, doc.y);
  });
}
```

**Exemple de sortie** :
```
TVA 5.5%                        50.00€ HT
  Montant TVA                    2.75€
TVA 10.0%                       30.00€ HT
  Montant TVA                    3.00€
```

#### 5. Totaux (lignes 163-171)
```javascript
lineText('TOTAL HT', formatPrice(sale.total_ht), doc.y);

doc.fontSize(12).font('Helvetica-Bold');
lineText('TOTAL TTC', formatPrice(sale.total_ttc), doc.y);
```

**Format** :
```
TOTAL HT                        80.00€
TOTAL TTC                       85.75€  (en gros et gras)
```

#### 6. Informations de paiement (lignes 181-214)
```javascript
const paymentLabels = {
  cash: 'Espèces',
  card: 'Carte Bancaire',
  meal_voucher: 'Titres Restaurant',
  mixed: 'Paiement Mixte',
};

doc.text(`Mode: ${paymentLabels[sale.payment_method]}`, 20);

// Si paiement mixte, afficher le détail
if (sale.payment_method === 'mixed' && sale.payment_details.payments) {
  sale.payment_details.payments.forEach((p) => {
    doc.text(`  - ${paymentLabels[p.method]}: ${formatPrice(p.amount)}`, 20);
  });
}

lineText('Montant payé', formatPrice(sale.amount_paid), doc.y);
if (sale.change_given > 0) {
  lineText('Rendu monnaie', formatPrice(sale.change_given), doc.y);
}
```

**Exemple paiement mixte** :
```
Mode: Paiement Mixte
  - Espèces: 50.00€
  - Carte Bancaire: 35.75€
Montant payé                    85.75€
```

#### 7. Footer convivial (lignes 227-230)
```javascript
doc.fontSize(8).fillColor('#666666');
centerText('Merci de votre visite !', doc.y);
centerText(`À bientôt chez ${settings.store_name || 'FlexPOS'}`, doc.y);
```

#### 8. Mentions légales (lignes 234-251)
```javascript
if (settings.legal_form && settings.capital_amount) {
  centerText(`${settings.legal_form} ${settings.store_name} - Capital: ${capital}€`, doc.y);
}
if (settings.siret) centerText(`SIRET: ${settings.siret}`, doc.y);
if (settings.vat_number) centerText(`TVA: ${settings.vat_number}`, doc.y);
if (settings.rcs) centerText(`RCS ${settings.rcs}`, doc.y);
```

**Exemple** :
```
SARL FlexPOS - Capital: 10000€
SIRET: 123 456 789 00010
TVA: FR12345678901
RCS Paris B 123 456 789
```

### Helpers internes

#### `centerText()` (lignes 22-26)
```javascript
const centerText = (text, y, options = {}) => {
  const textWidth = doc.widthOfString(text, options);
  const x = (pageWidth - textWidth) / 2;
  doc.text(text, x, y, options);
};
```
Permet de centrer du texte horizontalement sur le ticket.

#### `lineText()` (lignes 29-35)
```javascript
const lineText = (left, right, y) => {
  doc.text(left, 20, y, { width: contentWidth / 2, align: 'left' });
  doc.text(right, 20 + contentWidth / 2, y, {
    width: contentWidth / 2,
    align: 'right',
  });
};
```
Affiche un texte aligné à gauche et un texte aligné à droite sur la même ligne (pour les totaux).

### Conformité légale française

✅ **Mentions obligatoires présentes** :
- Nom commercial (store_name)
- Adresse complète
- SIRET
- Numéro de TVA intracommunautaire
- RCS
- Forme juridique et capital social
- Date et heure de vente
- Détail TVA par taux
- Numéro de ticket unique

⚠️ **Manques pour NF525** :
- ❌ Pas de **hash de chaîne** (closing_hash)
- ❌ Pas de **signature numérique**
- ❌ Pas de **numéro séquentiel certifié**

### Export

```javascript
module.exports = {
  generateTicketPDF,
};
```

Une seule fonction exportée.

---

## printerService.js - Impression thermique ESC/POS

**Localisation** : `/backend/src/services/printerService.js`
**Lignes** : 462 lignes
**Dépendances** : `node-thermal-printer`, `logger`, `helpers.formatPrice`, `settingsCache`
**Pattern** : Singleton Class (instance unique exportée)

### Vue d'ensemble

Service d'impression **ESC/POS** pour imprimantes thermiques 80mm. Compatible avec les marques :
- **EPSON** (type par défaut)
- **Star**
- **Tanca**

La configuration est chargée dynamiquement depuis la BDD (`store_settings.printer_config`).

### Architecture de la classe

```javascript
class PrinterService {
  constructor() {
    this.printer = null;
    this.config = null;
  }
  // ... méthodes
}

// Singleton
const printerService = new PrinterService();
module.exports = printerService;
```

### Configuration attendue

La config est stockée dans `StoreSettings.printer_config` (JSONB) :

```javascript
{
  enabled: false,           // Activer/désactiver l'impression
  type: 'epson',           // 'epson', 'star', 'tanca'
  interface: 'tcp',        // 'tcp', 'usb', 'printer'
  ip: '192.168.1.100',     // Si interface = 'tcp'
  port: 9100,              // Port TCP (9100 par défaut)
  path: '/dev/usb/lp0',    // Si interface = 'usb' ou 'printer'
  auto_print: true,        // Impression automatique après vente
}
```

### Méthode 1 : `loadConfig()` (lignes 21-33)

```javascript
async loadConfig() {
  const settings = await settingsCache.getSettings();
  this.config = settings.printer_config || {
    enabled: false,
    type: 'epson',
    interface: 'tcp',
    ip: '',
    port: 9100,
    path: '',
    auto_print: true,
  };
  return this.config;
}
```

Charge la configuration depuis le cache des settings. Si aucune config, utilise des valeurs par défaut avec `enabled: false`.

### Méthode 2 : `initialize()` (lignes 38-98)

**Rôle** : Initialiser la connexion à l'imprimante selon la configuration BDD.

```javascript
async initialize() {
  await this.loadConfig();

  if (!this.config.enabled) {
    logger.info('📄 Imprimante désactivée (config BDD)');
    return false;
  }

  try {
    // Déterminer le type d'imprimante
    let printerType = PrinterTypes.EPSON;
    if (this.config.type === 'star') printerType = PrinterTypes.STAR;
    else if (this.config.type === 'tanca') printerType = PrinterTypes.TANCA;

    // Config de base
    const config = {
      type: printerType,
      characterSet: 'PC858_EURO', // Support caractères français + €
      removeSpecialCharacters: false,
      lineCharacter: '-',
      width: 48, // 48 caractères pour imprimante 80mm
    };

    // Interface TCP
    if (this.config.interface === 'tcp') {
      if (!this.config.ip) {
        logger.warn('⚠️ IP imprimante non définie, impression désactivée');
        this.config.enabled = false;
        return false;
      }
      config.interface = `tcp://${this.config.ip}:${this.config.port}`;
    }
    // Interface USB/Printer
    else if (this.config.interface === 'usb' || this.config.interface === 'printer') {
      if (!this.config.path) {
        logger.warn('⚠️ Chemin imprimante non défini, impression désactivée');
        this.config.enabled = false;
        return false;
      }
      config.interface = `printer:${this.config.path}`;
    }

    this.printer = new ThermalPrinter(config);

    // Tester la connexion
    const isConnected = await this.testConnection();
    if (isConnected) {
      logger.info(`🖨️ Imprimante initialisée (${this.config.type} via ${this.config.interface})`);
      return true;
    } else {
      logger.warn('⚠️ Impossible de se connecter à l\'imprimante, impression désactivée');
      this.config.enabled = false;
      return false;
    }
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation de l\'imprimante:', error);
    this.config.enabled = false;
    return false;
  }
}
```

**Points clés** :
- Validation de la config (IP ou path requis selon l'interface)
- Fallback automatique si erreur : désactive l'impression
- Test de connexion systématique

### Méthode 3 : `testConnection()` (lignes 100-113)

```javascript
async testConnection() {
  if (!this.printer) return false;

  try {
    const result = await this.printer.isPrinterConnected();
    return result;
  } catch (error) {
    logger.error('Erreur test connexion imprimante:', error);
    return false;
  }
}
```

Utilise la méthode native `isPrinterConnected()` de `node-thermal-printer`.

### Méthode 4 : `printSaleTicket()` (lignes 115-266)

**Rôle** : Imprimer un ticket de vente thermique.

**Signature** :
```javascript
async printSaleTicket(sale, settings)
```

**Paramètres** :
- `sale` : Objet Sale avec items, user, vat_details
- `settings` : Paramètres du commerce

**Retour** :
```javascript
{ success: true, message: 'Ticket imprimé' }
// ou
{ success: false, message: 'Imprimante non disponible' }
```

**Structure du ticket thermique** :

```javascript
// 1. Header centré avec double hauteur
this.printer.alignCenter();
this.printer.setTextDoubleHeight();
this.printer.bold(true);
this.printer.println(settings.commerce_name || 'FlexPOS');

// 2. Infos commerce
if (settings.address) this.printer.println(settings.address);
if (settings.siret) this.printer.println(`SIRET: ${settings.siret}`);

// 3. Ligne de séparation
this.printer.drawLine();

// 4. Numéro de ticket et date
this.printer.alignLeft();
this.printer.bold(true);
this.printer.println(`Ticket N${sale.ticket_number}`);
this.printer.println(new Date(sale.created_at).toLocaleString('fr-FR'));

// 5. Articles
sale.items.forEach((item) => {
  this.printer.bold(true);
  this.printer.println(item.product_name);
  this.printer.bold(false);
  const line = `  ${item.quantity} x ${formatPrice(item.unit_price_ttc)} = ${formatPrice(item.total_ttc)}`;
  this.printer.println(line);
});

// 6. Totaux
this.printer.println(`Total HT:     ${formatPrice(sale.total_ht).padStart(20)}`);
this.printer.setTextDoubleHeight();
this.printer.bold(true);
this.printer.println(`TOTAL TTC:    ${formatPrice(sale.total_ttc).padStart(10)}`);

// 7. Paiement
this.printer.println(`Paiement: ${paymentMethodLabels[sale.payment_method]}`);

// 8. Footer
this.printer.alignCenter();
this.printer.println(settings.footer_message || 'Merci de votre visite !');

// 9. Coupe du papier
this.printer.cut();

// 10. Envoyer à l'imprimante
await this.printer.execute();
```

**⚠️ Problème détecté** (ligne 136) :
```javascript
this.printer.println(settings.commerce_name || 'FlexPOS');
```
**Incohérence** : Utilise `settings.commerce_name` alors que partout ailleurs c'est `settings.store_name`.
👉 **Bug mineur** : devrait être `settings.store_name`.

### Méthode 5 : `printXReport()` (lignes 268-332)

**Rôle** : Imprimer un **Ticket X** (rapport intermédiaire sans clôture de caisse).

**Signature** :
```javascript
async printXReport(report, settings)
```

**Contenu du Ticket X** :
- Titre : "TICKET X - RAPPORT INTERMEDIAIRE"
- Date du rapport
- Nom du caissier
- Nombre de tickets vendus
- Total ventes TTC
- Répartition par moyens de paiement (Espèces, Carte, Ticket Restaurant)
- Mention : "Rapport non fiscal - Caisse toujours ouverte"

**Exemple** :
```
        TICKET X
  RAPPORT INTERMEDIAIRE

FlexPOS
--------------------------------
Date: 15/11/2025 14:30:15
Caissier: Jean Dupont
--------------------------------
VENTES
Nombre de tickets: 23
Total ventes TTC:  512.50€

MOYENS DE PAIEMENT
Especes:           230.00€
Carte:             252.50€
Ticket Restaurant:  30.00€
--------------------------------
    Rapport non fiscal
  Caisse toujours ouverte
```

### Méthode 6 : `printZReport()` (lignes 334-418)

**Rôle** : Imprimer un **Ticket Z** (rapport de clôture de caisse).

**Signature** :
```javascript
async printZReport(cashRegister, settings)
```

**Contenu du Ticket Z** :
- Titre : "TICKET Z - CLOTURE DE CAISSE"
- Date d'ouverture et de clôture
- Nom du caissier
- Nombre de tickets vendus
- Total ventes TTC
- Répartition par moyens de paiement
- **Section CAISSE** :
  - Fond de caisse
  - Espèces attendues
  - Espèces comptées
  - **Écart** (mis en gras si différent de 0)
- Mention : "Caisse clôturée - Rapport fiscal"

**Exemple** :
```
        TICKET Z
   CLOTURE DE CAISSE

FlexPOS
--------------------------------
Ouverture: 15/11/2025 08:00:00
Cloture:   15/11/2025 20:00:00
Caissier: Jean Dupont
--------------------------------
VENTES
Nombre de tickets: 87
Total ventes TTC:  1842.30€

MOYENS DE PAIEMENT
Especes:           720.00€
Carte:             992.30€
Ticket Restaurant: 130.00€
--------------------------------
CAISSE
Fond de caisse:    100.00€
Especes attendues: 820.00€
Especes comptees:  815.00€

Ecart:             -5.00€
--------------------------------
      Caisse clôturée
      Rapport fiscal
```

### Méthode 7 : `printTestTicket()` (lignes 420-455)

**Rôle** : Imprimer un ticket de test simple pour vérifier la connexion.

```javascript
async printTestTicket() {
  await this.loadConfig();
  if (!this.config.enabled || !this.printer) {
    return { success: false, message: 'Imprimante non disponible' };
  }

  try {
    this.printer.clear();
    this.printer.alignCenter();
    this.printer.setTextDoubleHeight();
    this.printer.bold(true);
    this.printer.println('TEST IMPRIMANTE');
    this.printer.bold(false);
    this.printer.setTextNormal();
    this.printer.println('FlexPOS POS');
    this.printer.println(new Date().toLocaleString('fr-FR'));
    this.printer.println('Imprimante fonctionnelle !');
    this.printer.cut();
    await this.printer.execute();

    logger.info('✅ Ticket de test imprimé');
    return { success: true, message: 'Test réussi' };
  } catch (error) {
    logger.error('❌ Erreur lors du test d\'impression:', error);
    return { success: false, message: `Erreur: ${error.message}` };
  }
}
```

### Problèmes de compatibilité des données

**⚠️ Incohérence de structure** :

Dans `printXReport()` et `printZReport()`, le service attend des propriétés qui **ne correspondent pas** aux colonnes du modèle `CashRegister` :

| Attendu par le service | Colonne réelle du modèle |
|------------------------|--------------------------|
| `cashRegister.ticket_count` | ❌ N'existe pas (devrait être `total_sales`) |
| `cashRegister.total_sales` | ❌ Correspond à `total_sales` (nombre de ventes, pas montant) |
| `cashRegister.total_cash` | ❌ N'existe pas (devrait être calculé) |
| `cashRegister.total_card` | ❌ N'existe pas |
| `cashRegister.total_meal_voucher` | ❌ N'existe pas |
| `cashRegister.expected_cash` | ❌ N'existe pas (devrait être `expected_balance`) |
| `cashRegister.actual_cash` | ❌ N'existe pas (devrait être `counted_cash`) |
| `cashRegister.cash_difference` | ❌ N'existe pas (devrait être `difference`) |

**Colonnes réelles du modèle CashRegister** :
- `total_sales` (nombre de ventes, INTEGER)
- `total_cash_collected` (espèces collectées)
- `expected_balance` (solde attendu)
- `counted_cash` (espèces comptées)
- `difference` (écart)

👉 **Bug majeur** : Ces méthodes ne fonctionneront pas avec les vraies données du modèle.

### Export

```javascript
const printerService = new PrinterService();
module.exports = printerService;
```

Instance singleton exportée directement.

---

## sumupService.js - Intégration paiement SumUp

**Localisation** : `/backend/src/services/sumupService.js`
**Lignes** : 286 lignes
**Dépendances** : `axios`, `logger`, `settingsCache`
**Pattern** : Singleton Class
**API** : SumUp API v0.1 (https://api.sumup.com/v0.1)

### Vue d'ensemble

Service d'intégration avec l'API **SumUp** pour les paiements par carte bancaire. SumUp propose des terminaux de paiement (Air, Solo) utilisés par les commerçants.

### Architecture de la classe

```javascript
class SumUpService {
  constructor() {
    this.config = null;
    this.baseURL = 'https://api.sumup.com/v0.1';
  }
  // ... méthodes
}

const sumupService = new SumUpService();
module.exports = sumupService;
```

### Configuration attendue

Stockée dans `StoreSettings.sumup_config` (JSONB) :

```javascript
{
  enabled: false,              // Activer/désactiver SumUp
  api_key: 'sup_sk_...',      // Clé API SumUp (Bearer token)
  merchant_code: 'MXXX123',   // Code marchand SumUp
  affiliate_key: '',          // Clé affilié (optionnel)
}
```

### Méthode 1 : `loadConfig()` (lignes 27-37)

```javascript
async loadConfig() {
  const settings = await settingsCache.getSettings();
  this.config = settings.sumup_config || {
    enabled: false,
    api_key: '',
    merchant_code: '',
    affiliate_key: '',
  };
  return this.config;
}
```

Charge la configuration depuis le cache, avec fallback sur valeurs par défaut.

### Méthode 2 : `isConfigured()` (lignes 42-56)

```javascript
async isConfigured() {
  await this.loadConfig();

  if (!this.config.enabled) {
    logger.info('💳 SumUp désactivé (config BDD)');
    return false;
  }

  if (!this.config.api_key || !this.config.merchant_code) {
    logger.warn('⚠️ Configuration SumUp incomplète (api_key ou merchant_code manquant)');
    return false;
  }

  return true;
}
```

Valide que SumUp est activé ET configuré correctement.

### Méthode 3 : `createCheckout()` (lignes 58-119)

**Rôle** : Créer un checkout SumUp (session de paiement).

**Signature** :
```javascript
async createCheckout({ amount, currency = 'EUR', reference, description })
```

**Paramètres** :
- `amount` : Montant en euros (ex: 12.50)
- `currency` : Devise (par défaut : 'EUR')
- `reference` : Référence unique (ex: ticket_number)
- `description` : Description du paiement

**Retour** :
```javascript
{
  success: true,
  checkout_id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'PENDING',
  amount: 12.50,
  date: '2025-11-15T14:30:00Z'
}
```

**Implémentation** :
```javascript
async createCheckout({ amount, currency = 'EUR', reference, description }) {
  const configured = await this.isConfigured();
  if (!configured) {
    return { success: false, error: 'SumUp n\'est pas configuré' };
  }

  try {
    // Convertir le montant (note: amountInCents calculé puis divisé par 100)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    const payload = {
      checkout_reference: reference,
      amount: amountInCents / 100, // SumUp API accepts decimal amounts
      currency,
      merchant_code: this.config.merchant_code,
      description: description || `Ticket ${reference}`,
    };

    logger.info(`📡 Création checkout SumUp: ${reference} - ${amount}€`);

    const checkoutURL = `${this.baseURL}/checkouts`;
    const response = await axios.post(checkoutURL, payload, {
      headers: {
        'Authorization': `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 secondes
    });

    if (response.data && response.data.id) {
      logger.info(`✅ Checkout SumUp créé: ${response.data.id}`);
      return {
        success: true,
        checkout_id: response.data.id,
        status: response.data.status,
        amount: response.data.amount,
        date: response.data.date,
      };
    } else {
      throw new Error('Réponse SumUp invalide');
    }
  } catch (error) {
    logger.error('❌ Erreur création checkout SumUp:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Erreur de connexion SumUp',
    };
  }
}
```

**⚠️ Code bizarre** (lignes 79-83) :
```javascript
const amountInCents = Math.round(parseFloat(amount) * 100);

const payload = {
  amount: amountInCents / 100, // SumUp API accepts decimal amounts
  // ...
};
```
On multiplie par 100 puis on divise par 100 ? 🤔
**Explication** : Le `Math.round()` arrondit pour éviter les problèmes de précision float (ex: 12.345 → 12.35), puis on redivise pour passer en décimal.
👉 **Code valide** mais pourrait être plus clair avec un commentaire.

### Méthode 4 : `getCheckoutStatus()` (lignes 121-162)

**Rôle** : Vérifier le statut d'un checkout existant.

**Signature** :
```javascript
async getCheckoutStatus(checkoutId)
```

**Retour** :
```javascript
{
  success: true,
  status: 'PAID',        // PENDING, PAID, FAILED, CANCELLED
  amount: 12.50,
  currency: 'EUR',
  date: '2025-11-15T14:30:00Z',
  transactions: [...]
}
```

**Implémentation** :
```javascript
async getCheckoutStatus(checkoutId) {
  const configured = await this.isConfigured();
  if (!configured) {
    return { success: false, error: 'SumUp n\'est pas configuré' };
  }

  try {
    const checkoutURL = `${this.baseURL}/checkouts`;
    const response = await axios.get(`${checkoutURL}/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.api_key}`,
      },
      timeout: 5000,
    });

    const { status, amount, currency, date, transactions } = response.data;

    return {
      success: true,
      status, // PENDING, PAID, FAILED, CANCELLED
      amount,
      currency,
      date,
      transactions,
    };
  } catch (error) {
    logger.error('❌ Erreur vérification statut SumUp:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}
```

**Statuts possibles** (ligne 149) :
- `PENDING` : En attente de paiement
- `PAID` : Paiement réussi
- `FAILED` : Paiement échoué
- `CANCELLED` : Annulé

### Méthode 5 : `processPayment()` (lignes 164-222)

**Rôle** : Traiter un paiement SumUp (avec terminal physique).

**⚠️ SIMULATION MVP** : Cette méthode est un **placeholder** pour l'intégration avec un terminal SumUp physique (Air/Solo). En production, elle nécessiterait le SDK SumUp.

**Signature** :
```javascript
async processPayment({ amount, reference })
```

**Implémentation actuelle (MVP)** :
```javascript
async processPayment({ amount, reference }) {
  const configured = await this.isConfigured();
  if (!configured) {
    return { success: false, error: 'SumUp n\'est pas configuré' };
  }

  logger.info(`💳 Traitement paiement SumUp: ${reference} - ${amount}€`);

  try {
    // Créer le checkout
    const checkout = await this.createCheckout({
      amount,
      reference,
      description: `FlexPOS - Ticket ${reference}`,
    });

    if (!checkout.success) {
      throw new Error(checkout.error);
    }

    // ⚠️ SIMULATION : Délai de traitement (terminal SumUp)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ⚠️ SIMULATION : En production, on attendrait ici la confirmation du terminal
    // Pour le MVP, on considère le paiement comme réussi
    logger.info(`✅ Paiement SumUp réussi: ${checkout.checkout_id}`);

    return {
      success: true,
      checkout_id: checkout.checkout_id,
      transaction_id: checkout.checkout_id, // Utilisé comme transaction_id pour le MVP
      amount,
      status: 'PAID',
      message: 'Paiement SumUp accepté',
    };
  } catch (error) {
    logger.error('❌ Erreur traitement paiement SumUp:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du paiement SumUp',
    };
  }
}
```

**⚠️ TODO pour production** (ligne 203) :
```javascript
// En production, on attendrait ici la confirmation du terminal
// Intégration avec SDK SumUp Air/Solo requis
```

### Méthode 6 : `getMerchantInfo()` (lignes 224-257)

**Rôle** : Récupérer les informations du compte marchand SumUp (utile pour vérifier la configuration).

**Endpoint** : `GET https://api.sumup.com/v0.1/me`

**Retour** :
```javascript
{
  success: true,
  merchant: {
    merchant_code: 'MXXX123',
    merchant_profile: {
      business_name: 'FlexPOS SARL',
      // ... autres infos
    }
  }
}
```

### Méthode 7 : `testConnection()` (lignes 259-279)

**Rôle** : Tester la connexion à l'API SumUp en récupérant les infos marchand.

```javascript
async testConnection() {
  logger.info('🔍 Test de connexion SumUp...');

  if (!this.isConfigured()) {
    logger.warn('⚠️ SumUp non configuré');
    return false;
  }

  const result = await this.getMerchantInfo();

  if (result.success) {
    logger.info(`✅ Connexion SumUp OK - Marchand: ${result.merchant?.merchant_profile?.business_name || 'N/A'}`);
    return true;
  } else {
    logger.error(`❌ Connexion SumUp échouée: ${result.error}`);
    return false;
  }
}
```

### Timeouts configurés

| Méthode | Timeout | Raison |
|---------|---------|--------|
| `createCheckout()` | 10 000 ms | Création peut être lente |
| `getCheckoutStatus()` | 5 000 ms | Requête simple |
| `getMerchantInfo()` | 5 000 ms | Requête simple |

### Export

```javascript
const sumupService = new SumUpService();
module.exports = sumupService;
```

Instance singleton exportée.

---

## vatService.js - Calculs de TVA

**Localisation** : `/backend/src/services/vatService.js`
**Lignes** : 112 lignes
**Dépendances** : Aucune (fonctions pures)
**Pattern** : Module fonctionnel

### Vue d'ensemble

Service de **calculs de TVA** et **totaux** pour les ventes. Contient 6 fonctions pures utilitaires, toutes avec arrondi à **2 décimales** (`.toFixed(2)`).

### Fonction 1 : `calculateTTC()` (lignes 11-13)

**Rôle** : Calculer le prix TTC à partir du prix HT et du taux de TVA.

**Signature** :
```javascript
const calculateTTC = (priceHT, vatRate) => {
  return parseFloat((priceHT * (1 + vatRate / 100)).toFixed(2));
};
```

**Exemple** :
```javascript
calculateTTC(100, 10)    // 110.00
calculateTTC(50, 5.5)    // 52.75
```

**Formule** : `TTC = HT × (1 + taux/100)`

### Fonction 2 : `calculateVATAmount()` (lignes 15-23)

**Rôle** : Calculer le montant de TVA.

```javascript
const calculateVATAmount = (priceHT, vatRate) => {
  return parseFloat((priceHT * (vatRate / 100)).toFixed(2));
};
```

**Exemple** :
```javascript
calculateVATAmount(100, 10)    // 10.00
calculateVATAmount(100, 5.5)   // 5.50
```

**Formule** : `Montant TVA = HT × (taux/100)`

### Fonction 3 : `calculateLineTotal()` (lignes 25-43)

**Rôle** : Calculer les totaux d'une ligne de vente (avec quantité et remise optionnelle).

**Signature** :
```javascript
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
```

**Exemple** :
```javascript
calculateLineTotal(2, 10, 10)           // { totalHT: 20.00, totalTTC: 22.00, vatAmount: 2.00 }
calculateLineTotal(3, 10, 5.5, 5)       // { totalHT: 25.00, totalTTC: 26.38, vatAmount: 1.38 }
//                                         (3×10 - 5 = 25 HT, TVA 5.5% = 1.38, TTC = 26.38)
```

**Formules** :
1. `Total HT = (quantité × prix unitaire HT) - remise`
2. `Montant TVA = Total HT × (taux/100)`
3. `Total TTC = Total HT + Montant TVA`

### Fonction 4 : `calculateVATDetails()` (lignes 45-75)

**Rôle** : Calculer le récapitulatif TVA d'une vente, **groupé par taux**.

**Signature** :
```javascript
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
```

**Exemple** :
```javascript
const items = [
  { total_ht: 100, total_ttc: 110, vat_rate: 10.0 },
  { total_ht: 50, total_ttc: 55, vat_rate: 10.0 },
  { total_ht: 30, total_ttc: 31.65, vat_rate: 5.5 },
];

calculateVATDetails(items);
// Résultat:
// {
//   "10.0": { base_ht: 150, amount_vat: 15, total_ttc: 165 },
//   "5.5": { base_ht: 30, amount_vat: 1.65, total_ttc: 31.65 }
// }
```

**Utilité** : Afficher le détail TVA par taux sur le ticket (obligation légale).

### Fonction 5 : `calculateSaleTotals()` (lignes 77-92)

**Rôle** : Calculer les totaux globaux d'une vente (somme de tous les items).

**Signature** :
```javascript
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
```

**Exemple** :
```javascript
const items = [
  { total_ht: 10, total_ttc: 11, vat_rate: 10.0 },
  { total_ht: 20, total_ttc: 22, vat_rate: 10.0 },
  { total_ht: 30, total_ttc: 31.65, vat_rate: 5.5 },
];

calculateSaleTotals(items);
// {
//   totalHT: 60.00,
//   totalTTC: 64.65,
//   vatDetails: {
//     "10.0": { base_ht: 30, amount_vat: 3, total_ttc: 33 },
//     "5.5": { base_ht: 30, amount_vat: 1.65, total_ttc: 31.65 }
//   }
// }
```

### Fonction 6 : `calculateChange()` (lignes 94-102)

**Rôle** : Calculer la monnaie à rendre.

```javascript
const calculateChange = (totalTTC, amountPaid) => {
  return parseFloat((amountPaid - totalTTC).toFixed(2));
};
```

**Exemple** :
```javascript
calculateChange(47.50, 50)    // 2.50
calculateChange(12.75, 20)    // 7.25
calculateChange(10, 10)       // 0.00
```

**Formule** : `Monnaie = Montant payé - Total TTC`

### Export

```javascript
module.exports = {
  calculateTTC,
  calculateVATAmount,
  calculateLineTotal,
  calculateVATDetails,
  calculateSaleTotals,
  calculateChange,
};
```

Toutes les 6 fonctions exportées.

---

## Problèmes détectés

### 🔴 Bugs critiques

| # | Service | Ligne | Problème | Impact |
|---|---------|-------|----------|--------|
| 1 | `printerService.js` | 136 | Utilise `settings.commerce_name` au lieu de `settings.store_name` | ❌ Affiche "undefined" sur ticket thermique |
| 2 | `printerService.js` | 304, 371, etc. | Propriétés attendues (`ticket_count`, `total_cash`, etc.) n'existent pas dans le modèle `CashRegister` | ❌ Tickets X/Z ne fonctionneront pas |
| 3 | `printerService.js` | 388-389 | Utilise `expected_cash` et `actual_cash` au lieu de `expected_balance` et `counted_cash` | ❌ Rapport de clôture incorrect |

### ⚠️ Problèmes de conception

| # | Service | Problème | Recommandation |
|---|---------|----------|----------------|
| 1 | `sumupService.js` | Simulation MVP (ligne 201) au lieu d'intégration réelle avec terminal | Intégrer le SDK SumUp Air/Solo |
| 2 | `printerService.js` | Aucun test de connexion au démarrage de l'application | Ajouter `printerService.initialize()` au startup |
| 3 | `pdfService.js` | Pas de hash NF525 sur le ticket PDF | Ajouter `closing_hash` et signature numérique |
| 4 | Tous | Pas de gestion multi-tenant (organization_id) | Passer `organizationId` en paramètre |

### 🟡 Warnings mineurs

| # | Service | Ligne | Problème |
|---|---------|-------|----------|
| 1 | `sumupService.js` | 79-83 | Code bizarre (multiplie par 100 puis divise) |
| 2 | `pdfService.js` | - | Pas de gestion des tickets très longs (pagination) |
| 3 | `printerService.js` | 182 | Assume que `sale.vat_details` est un Array, mais modèle le définit comme JSONB Object |

---

## Recommandations Multi-Tenant

Pour transformer ces services en **multi-tenant**, voici les modifications nécessaires :

### 1. pdfService.js

**Aucune modification requise** : Ce service génère des PDF à partir des données fournies en paramètre. Le filtrage par `organization_id` doit être fait en amont (dans le controller).

### 2. printerService.js

**Problème** : La config imprimante est globale (1 seule config dans `store_settings`).

**Solution multi-tenant** :

Option A : **1 config imprimante par organization**
```javascript
// Ajouter organization_id à la config
async loadConfig(organizationId) {
  const settings = await settingsCache.getSettings(organizationId);
  this.config = settings.printer_config || { ... };
}

// Modifier toutes les méthodes pour passer organizationId
async printSaleTicket(sale, settings, organizationId) {
  await this.loadConfig(organizationId);
  // ...
}
```

Option B : **Table dédiée printer_configs**
```sql
CREATE TABLE printer_configs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  enabled BOOLEAN DEFAULT false,
  type VARCHAR(20),
  interface VARCHAR(20),
  ip VARCHAR(50),
  port INTEGER,
  path VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. sumupService.js

**Problème** : Config SumUp globale (1 seul compte marchand).

**Solution multi-tenant** :

Option A : **1 compte SumUp par organization**
```javascript
async loadConfig(organizationId) {
  const settings = await settingsCache.getSettings(organizationId);
  this.config = settings.sumup_config || { ... };
}

// Modifier toutes les méthodes
async createCheckout({ organizationId, amount, currency, reference, description }) {
  await this.loadConfig(organizationId);
  // ...
}
```

Option B : **Table dédiée payment_providers**
```sql
CREATE TABLE payment_providers (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  provider VARCHAR(50), -- 'sumup', 'stripe', 'paypal'
  enabled BOOLEAN DEFAULT false,
  config JSONB, -- { api_key, merchant_code, etc. }
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. vatService.js

**Aucune modification requise** : Fonctions pures de calcul, pas de dépendance BDD.

---

## Recommandations NF525

### Conformité actuelle : 2/10 ⚠️

Pour conformité **NF525** (loi anti-fraude TVA), il manque :

### 1. pdfService.js - Tickets PDF

**❌ Manques critiques** :

1. **Hash chaîné** : Ajouter le `closing_hash` sur chaque ticket
```javascript
// Ajouter après les mentions légales (ligne 251)
if (sale.closing_hash) {
  doc.fontSize(6).fillColor('#000000');
  doc.text(`Hash: ${sale.closing_hash}`, 20);
}
```

2. **Signature numérique** : Ajouter une signature RSA du ticket
```javascript
const crypto = require('crypto');

// Générer la signature
const dataToSign = `${sale.ticket_number}|${sale.total_ttc}|${sale.created_at}`;
const signature = crypto.sign('sha256', Buffer.from(dataToSign), privateKey);

// Ajouter au ticket
doc.fontSize(6);
doc.text(`Signature: ${signature.toString('base64').substring(0, 50)}...`, 20);
```

3. **Numéro de série certifié** : Utiliser un compteur séquentiel global par organization

### 2. printerService.js - Tickets thermiques

**❌ Manques critiques** :

1. **Hash sur ticket** : Imprimer le `closing_hash`
```javascript
// Ajouter avant la coupe du papier (ligne 252)
if (sale.closing_hash) {
  this.printer.setTextSize(0, 0);
  this.printer.println(`Hash: ${sale.closing_hash.substring(0, 32)}`);
  this.printer.setTextNormal();
}
```

2. **Mention certification NF525** :
```javascript
this.printer.println('Systeme certifie NF525');
this.printer.println(`Certificat: FR-NF525-2024-XXXXX`);
```

### 3. sumupService.js

**✅ Pas de modification requise** : Les paiements SumUp sont déjà tracés (checkout_id).

### 4. vatService.js

**✅ Pas de modification requise** : Les calculs sont corrects.

### Plan d'action NF525

| Étape | Action | Fichier concerné |
|-------|--------|------------------|
| 1 | Ajouter colonne `closing_hash` au modèle Sale | `models/Sale.js` |
| 2 | Implémenter hash chaîné SHA-256 dans `saleController.createSale()` | `controllers/saleController.js` |
| 3 | Ajouter affichage hash sur PDF | `services/pdfService.js` |
| 4 | Ajouter affichage hash sur thermique | `services/printerService.js` |
| 5 | Générer clé RSA privée pour signatures | `utils/crypto.js` |
| 6 | Implémenter signature numérique sur tickets | `services/pdfService.js` |
| 7 | Créer table `nf525_certificates` pour stocker les certifications | Migration BDD |

---

## Résumé statistique

| Métrique | Valeur |
|----------|--------|
| **Services analysés** | 4 |
| **Lignes de code totales** | 1,119 |
| **Fonctions/méthodes** | 23 |
| **Bugs critiques** | 3 |
| **Warnings** | 3 |
| **Dépendances NPM** | 4 (pdfkit, node-thermal-printer, axios, logger) |
| **Pattern Singleton** | 2 (printerService, sumupService) |
| **Pattern Functional** | 2 (pdfService, vatService) |
| **Conformité NF525** | 2/10 ⚠️ |
| **Multi-tenant ready** | 1/4 (vatService uniquement) |

---

**Fin de la documentation BACKEND_SERVICES.md**
