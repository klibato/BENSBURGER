# 📘 GUIDE UTILISATEUR - FlexPOS

**Version :** 2.0.0
**Date :** 2025-11-20
**Public :** Utilisateurs caissiers, managers, responsables de magasin

---

## 📋 Table des matières

1. [Premiers pas](#premiers-pas)
2. [Interface de caisse (POS)](#interface-de-caisse-pos)
3. [Gestion des produits](#gestion-des-produits)
4. [Images produits](#images-produits)
5. [Rapports Z quotidiens](#rapports-z-quotidiens)
6. [Gestion des utilisateurs](#gestion-des-utilisateurs)
7. [Paiements et moyens de paiement](#paiements-et-moyens-de-paiement)
8. [Dépannage](#dépannage)
9. [FAQ](#faq)

---

## 🚀 Premiers pas

### Connexion à FlexPOS

**URL de connexion :**
```
https://app.flexpos.app/login
```

**Identifiants :**
- **Email :** Votre adresse email professionnelle
- **Mot de passe :** Fourni par votre administrateur

**Première connexion :**
1. Accédez à l'URL de connexion
2. Entrez votre email et mot de passe
3. Cliquez sur "Se connecter"
4. Vous serez redirigé vers l'interface de caisse

**Changement de mot de passe :**

Si vous devez changer votre mot de passe :
```bash
POST /api/auth/change-password
Content-Type: application/json

{
  "current_password": "ancien_mot_de_passe",
  "new_password": "nouveau_mot_de_passe"
}
```

---

## 🖥️ Interface de caisse (POS)

### Vue d'ensemble

L'interface de caisse FlexPOS se compose de 3 zones principales :

```
┌─────────────────────────────────────────────────────┐
│  HEADER - Logo, Utilisateur, Déconnexion           │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  LISTE PRODUITS  │      TICKET EN COURS             │
│                  │                                  │
│  [Recherche]     │  Article 1 .......... 15.50€    │
│                  │  Article 2 ........... 8.20€    │
│  Catégories:     │  Article 3 .......... 22.00€    │
│  - Boissons      │                                  │
│  - Plats         │  ─────────────────────────────   │
│  - Desserts      │  TOTAL TTC ......... 45.70€     │
│                  │                                  │
├──────────────────┴──────────────────────────────────┤
│  ACTIONS: [Encaisser] [Annuler] [Pause] [Rapport Z]│
└─────────────────────────────────────────────────────┘
```

### Créer une vente

**Étape 1 : Sélectionner les produits**

1. Cliquez sur un produit dans la liste de gauche
2. Le produit s'ajoute automatiquement au ticket en cours
3. Répétez pour chaque article

**Raccourcis clavier :**
- `F1-F12` : Raccourcis produits favoris (configurable)
- `Ctrl + F` : Rechercher un produit
- `Suppr` : Retirer l'article sélectionné du ticket

**Étape 2 : Vérifier le ticket**

- Total HT : Montant hors taxes
- TVA : Détail par taux (5.5%, 10%, 20%)
- Total TTC : Montant toutes taxes comprises

**Étape 3 : Encaisser**

1. Cliquez sur "Encaisser"
2. Choisissez le moyen de paiement :
   - 💵 **Espèces** (CASH)
   - 💳 **Carte bancaire** (CARD)
   - 🎟️ **Tickets restaurant** (MEAL_VOUCHER)
   - 🔀 **Paiement mixte** (MIXED)

3. Validez le paiement
4. Imprimez ou envoyez le ticket par email

**Exemple de ticket :**

```
╔═══════════════════════════════════════╗
║          FLEXPOS - CAISSE 1           ║
║      123 Rue Example, Paris           ║
║         SIRET: 123 456 789            ║
╠═══════════════════════════════════════╣
║                                       ║
║  Ticket N° : T-20251120-0042          ║
║  Date/Heure: 20/11/2025 14:35:12     ║
║  Caissier  : Marie Dupont             ║
║                                       ║
╠═══════════════════════════════════════╣
║                                       ║
║  Café             x2      5.00 €      ║
║  Croissant        x1      1.50 €      ║
║  Sandwich poulet  x1      8.50 €      ║
║                                       ║
╠═══════════════════════════════════════╣
║                                       ║
║  TOTAL HT               12.50 €       ║
║  TVA 5.5%                0.35 €       ║
║  TVA 10%                 0.65 €       ║
║                                       ║
║  TOTAL TTC              15.00 €       ║
║                                       ║
║  Payé CARTE BANCAIRE    15.00 €       ║
║                                       ║
╠═══════════════════════════════════════╣
║  Hash NF525:                          ║
║  a3f8c9d2e1b4...                      ║
║                                       ║
║  Merci de votre visite !              ║
╚═══════════════════════════════════════╝
```

### Annuler une vente

**Avant encaissement :**
- Cliquez sur "Annuler" pour vider le ticket en cours
- Aucune trace n'est conservée

**Après encaissement :**

⚠️ **ATTENTION** : En raison de la norme NF525, **les ventes ne peuvent PAS être supprimées** après encaissement.

**Solution :** Créer une vente d'annulation (avoir)

1. Créez une nouvelle vente
2. Ajoutez les mêmes produits en quantité négative
3. Encaissez normalement
4. Le montant sera déduit du rapport Z quotidien

---

## 📦 Gestion des produits

### Créer un produit

**Via l'interface web :**

1. Accédez à "Produits" > "Nouveau produit"
2. Remplissez les champs obligatoires :
   - **Nom** : Nom du produit (ex: "Café expresso")
   - **Prix TTC** : Prix de vente en euros
   - **Taux de TVA** : 5.5%, 10% ou 20%
   - **Catégorie** : Boissons, Plats, Desserts, etc.
3. Champs optionnels :
   - **Code-barres** : EAN13, EAN8
   - **Description** : Texte libre
   - **Image** : Upload d'une photo (voir section suivante)
4. Cliquez sur "Enregistrer"

**Via l'API :**

```bash
POST /api/products
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "name": "Café expresso",
  "price_ttc": 2.50,
  "tax_rate": 10.0,
  "category_id": 1,
  "barcode": "3760123456789",
  "description": "Café 100% arabica torréfié"
}
```

**Réponse :**
```json
{
  "id": 42,
  "name": "Café expresso",
  "price_ttc": "2.50",
  "tax_rate": "10.0",
  "category_id": 1,
  "barcode": "3760123456789",
  "created_at": "2025-11-20T14:30:00Z"
}
```

### Modifier un produit

1. Accédez à "Produits" > Cliquez sur le produit à modifier
2. Modifiez les champs souhaités
3. Cliquez sur "Enregistrer"

**Champs modifiables :**
- ✅ Nom, description, catégorie
- ✅ Prix TTC, taux de TVA
- ✅ Code-barres
- ✅ Image

### Désactiver un produit

**Pour retirer un produit de la vente sans le supprimer :**

1. Accédez au produit
2. Cochez "Produit inactif"
3. Enregistrez

Le produit n'apparaîtra plus dans la liste de caisse mais restera dans l'historique des ventes.

---

## 📸 Images produits

### Formats supportés

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)
- **GIF** (.gif)

**Taille maximale :** 5 MB par image

**Résolution recommandée :** 800x800 pixels

### Upload d'une image

**Via l'interface web :**

1. Accédez au produit
2. Cliquez sur "Ajouter une image"
3. Sélectionnez le fichier sur votre ordinateur
4. L'image est automatiquement uploadée et associée au produit

**Via l'API :**

```bash
POST /api/products/42/image
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

[Fichier image en multipart/form-data]
```

**Réponse :**
```json
{
  "success": true,
  "image_url": "/uploads/products/org_6_prod_42_1732118400000.jpg"
}
```

### Affichage des images

Les images sont accessibles publiquement via :

```
https://api.flexpos.app/uploads/products/org_6_prod_42_1732118400000.jpg
```

**Format du nom de fichier :**
```
org_{organization_id}_prod_{product_id}_{timestamp}.{extension}
```

### Remplacement d'une image

1. Uploadez une nouvelle image via la même procédure
2. **L'ancienne image est automatiquement supprimée** du serveur
3. Seule la dernière image est conservée

**Sécurité multi-tenant :**
- Chaque organisation ne peut accéder qu'à ses propres images
- Les images sont stockées avec le préfixe `org_{id}` pour garantir l'isolation

---

## 📊 Rapports Z quotidiens

### Qu'est-ce qu'un rapport Z ?

Le **rapport Z** est un **document fiscal obligatoire** (norme NF525) généré à la **fin de chaque journée** pour clôturer la caisse.

**Contenu du rapport Z :**
- Nombre total de ventes
- Montant total TTC, HT, TVA
- Répartition par moyen de paiement (espèces, carte, etc.)
- Détail de la TVA par taux (5.5%, 10%, 20%)
- Numéros de tickets (premier et dernier)
- Hash SHA-256 de sécurité NF525

### Générer un rapport Z

**Via l'interface web :**

1. En fin de journée, cliquez sur "Rapport Z"
2. Vérifiez la date (par défaut : aujourd'hui)
3. Cliquez sur "Générer le rapport"
4. Le rapport est créé et affiché à l'écran

**Via l'API :**

```bash
POST /api/daily-reports/generate
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "report_date": "2025-11-20"
}
```

**Réponse :**
```json
{
  "id": 12,
  "organization_id": 6,
  "report_date": "2025-11-20",
  "total_sales_count": 47,
  "total_amount_ttc": "1850.50",
  "total_amount_ht": "1542.08",
  "total_tax": "308.42",
  "total_cash": "450.00",
  "total_card": "1200.50",
  "total_meal_voucher": "200.00",
  "vat_breakdown": {
    "5.5": "15.20",
    "10.0": "83.22",
    "20.0": "210.00"
  },
  "first_ticket_number": "T-20251120-0001",
  "last_ticket_number": "T-20251120-0047",
  "signature_hash": "b4815bb67bf19cf8f41e3b1bcdef7935664327c78ed0161866736bf5842ecf52",
  "status": "generated"
}
```

### Consulter les rapports Z

**Via l'interface web :**

1. Accédez à "Rapports" > "Rapports Z"
2. Filtrez par date (ex: novembre 2025)
3. Cliquez sur un rapport pour voir le détail

**Via l'API :**

```bash
GET /api/daily-reports?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer YOUR_JWT_TOKEN
```

### Exporter les rapports Z

**Format CSV :**

```bash
GET /api/daily-reports/export/csv?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer YOUR_JWT_TOKEN
```

**Résultat :** Fichier CSV téléchargé avec toutes les colonnes du rapport

**Colonnes du CSV :**
- Date du rapport
- Nombre de ventes
- Total TTC, HT, TVA
- Répartition par paiement
- Hash de signature

---

## 👥 Gestion des utilisateurs

### Rôles utilisateurs

**3 rôles disponibles :**

| Rôle | Droits | Usage |
|------|--------|-------|
| **CASHIER** | Encaissement uniquement | Caissiers |
| **MANAGER** | Encaissement + produits + rapports | Responsables de magasin |
| **ADMIN** | Tous les droits | Gérant, directeur |

### Créer un utilisateur

**Requis :** Rôle ADMIN

1. Accédez à "Utilisateurs" > "Nouvel utilisateur"
2. Remplissez :
   - Nom complet
   - Email professionnel
   - Rôle (CASHIER, MANAGER, ADMIN)
3. Un email avec le mot de passe temporaire est envoyé
4. L'utilisateur doit changer son mot de passe à la première connexion

**Via l'API :**

```bash
POST /api/users
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "full_name": "Jean Dupont",
  "email": "jean.dupont@example.com",
  "role": "CASHIER"
}
```

### Modifier un utilisateur

1. Accédez à "Utilisateurs"
2. Cliquez sur l'utilisateur à modifier
3. Modifiez les champs (nom, email, rôle)
4. Enregistrez

**Réinitialisation de mot de passe :**

Si un utilisateur a oublié son mot de passe :

```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "jean.dupont@example.com"
}
```

Un email avec un lien de réinitialisation sera envoyé.

### Désactiver un utilisateur

**Pour bloquer l'accès sans supprimer le compte :**

1. Accédez à l'utilisateur
2. Cochez "Compte désactivé"
3. Enregistrez

L'utilisateur ne pourra plus se connecter mais reste visible dans l'historique.

---

## 💳 Paiements et moyens de paiement

### Moyens de paiement supportés

#### 1. Espèces (CASH)

**Usage :**
- Paiement en liquide
- Rendu de monnaie automatique

**Interface :**
```
┌────────────────────────────────┐
│  TOTAL À PAYER : 15.50€        │
├────────────────────────────────┤
│  Montant reçu : [______] €     │
│                                │
│  [10€] [20€] [50€] [100€]      │
│                                │
│  Rendu : 4.50€                 │
└────────────────────────────────┘
```

#### 2. Carte bancaire (CARD)

**Types acceptés :**
- Carte bleue (CB)
- Visa, Mastercard
- American Express
- Contactless (NFC)

**Procédure :**
1. Sélectionnez "Carte bancaire"
2. Présentez le terminal de paiement au client
3. Attendez la validation (bip sonore)
4. Validez dans FlexPOS

#### 3. Tickets restaurant (MEAL_VOUCHER)

**Marques supportées :**
- Tickets Restaurant
- Chèques Déjeuner
- Pass Restaurant
- Apetiz

**Limites légales :**
- Maximum 19€ par ticket restaurant (au 01/01/2025)
- Utilisable uniquement pour la restauration

**Procédure :**
1. Vérifiez que tous les articles sont éligibles (catégorie "Restauration")
2. Sélectionnez "Tickets restaurant"
3. Saisissez le nombre de tickets
4. Validez

#### 4. Paiement mixte (MIXED)

**Usage :** Combiner plusieurs moyens de paiement

**Exemple :** Payer 30€ avec 19€ en tickets restaurant + 11€ en carte

**Procédure :**
1. Sélectionnez "Paiement mixte"
2. Ajoutez chaque moyen de paiement :
   - Tickets restaurant : 19.00€
   - Carte bancaire : 11.00€
3. Total doit correspondre au montant de la vente
4. Validez

**Via l'API :**
```bash
POST /api/sales
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "items": [
    {"product_id": 1, "quantity": 2, "price_ttc": 15.00}
  ],
  "payment_method": "MIXED",
  "payment_details": {
    "MEAL_VOUCHER": 19.00,
    "CARD": 11.00
  }
}
```

---

## 🔧 Dépannage

### Problème : Impossible de se connecter

**Symptômes :** Message "Email ou mot de passe incorrect"

**Solutions :**
1. Vérifiez que le Caps Lock n'est pas activé
2. Vérifiez votre email (pas d'espace avant/après)
3. Essayez de réinitialiser votre mot de passe
4. Contactez votre administrateur

### Problème : L'impression ne fonctionne pas

**Symptômes :** Le ticket ne s'imprime pas après encaissement

**Solutions :**
1. Vérifiez que l'imprimante est allumée
2. Vérifiez la connexion USB/réseau
3. Vérifiez qu'il reste du papier
4. Redémarrez l'imprimante
5. Vérifiez les paramètres d'impression dans FlexPOS

### Problème : Produit introuvable dans la liste

**Symptômes :** Un produit n'apparaît pas dans la caisse

**Solutions :**
1. Vérifiez que le produit est actif (pas désactivé)
2. Utilisez la recherche (Ctrl + F)
3. Vérifiez la catégorie du produit
4. Actualisez la page (F5)

### Problème : Erreur "NF525 Compliance: Sales are immutable"

**Symptômes :** Impossible de modifier une vente

**Explication :** C'est **normal** ! La norme NF525 **interdit** la modification des ventes après création.

**Solution :** Créez une vente d'annulation (voir section "Annuler une vente")

### Problème : Upload d'image échoue

**Symptômes :** Message "File too large" ou "Invalid format"

**Solutions :**
1. Vérifiez que l'image fait moins de 5 MB
2. Formats acceptés : JPEG, PNG, WebP, GIF uniquement
3. Compressez l'image avec un outil externe
4. Vérifiez votre connexion internet

### Problème : Rapport Z déjà généré

**Symptômes :** Message "Daily report already exists for this date"

**Explication :** Un rapport Z ne peut être généré qu'une fois par jour

**Solutions :**
1. Consultez le rapport existant dans "Rapports" > "Rapports Z"
2. Si vous devez le régénérer, contactez votre administrateur

---

## ❓ FAQ

### 1. Combien de produits puis-je créer ?

**Réponse :** Illimité. FlexPOS supporte un nombre illimité de produits.

### 2. Puis-je modifier une vente après encaissement ?

**Réponse :** Non. La norme NF525 (anti-fraude TVA) interdit toute modification après encaissement. Vous devez créer une vente d'annulation.

### 3. Combien de temps les données sont-elles conservées ?

**Réponse :** Minimum 6 ans conformément au décret n°2016-1551. FlexPOS conserve les données indéfiniment.

### 4. Puis-je utiliser FlexPOS hors ligne ?

**Réponse :** Non actuellement. FlexPOS nécessite une connexion internet pour fonctionner.

### 5. Comment sauvegarder mes données ?

**Réponse :** Les données sont automatiquement sauvegardées sur les serveurs FlexPOS. Des sauvegardes quotidiennes sont effectuées.

### 6. Puis-je avoir plusieurs caisses ?

**Réponse :** Oui. FlexPOS est multi-postes. Chaque caisse peut se connecter avec un compte utilisateur différent.

### 7. Comment générer un rapport mensuel ?

**Réponse :** Exportez les rapports Z du mois en CSV, puis consolidez-les dans Excel.

```bash
GET /api/daily-reports/export/csv?start_date=2025-11-01&end_date=2025-11-30
```

### 8. Que signifie le hash SHA-256 sur les tickets ?

**Réponse :** C'est une **empreinte cryptographique** garantissant l'intégrité du ticket (norme NF525). Elle prouve qu'aucune modification n'a été apportée.

### 9. Puis-je personnaliser l'en-tête des tickets ?

**Réponse :** Oui, dans "Paramètres" > "Informations de caisse" :
- Nom de l'entreprise
- Adresse
- SIRET
- Logo

### 10. Comment ajouter des taux de TVA personnalisés ?

**Réponse :** Les taux de TVA français sont pré-configurés (5.5%, 10%, 20%). Pour des taux spécifiques (ex: DOM-TOM), contactez le support.

---

## 📞 Support

**Email support :** support@flexpos.app

**Documentation technique :**
- [NF525_COMPLIANCE.md](NF525_COMPLIANCE.md) - Conformité fiscale
- [API_GUIDE.md](API_GUIDE.md) - Guide API
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md) - Guide super-admin

**Horaires :** Lundi-Vendredi 9h-18h (hors jours fériés)

---

**Dernière mise à jour :** 2025-11-20
**Version :** 2.0.0
**Statut :** ✅ PRODUCTION READY
