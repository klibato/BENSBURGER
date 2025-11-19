# Tests Unitaires FlexPOS Backend

## 📋 Vue d'ensemble

Tests unitaires pour valider l'isolation multi-tenant et la sécurité du backend FlexPOS.

## 🧪 Tests Disponibles

### Tests Multi-Tenant (productController.multiTenant.test.js)

Teste les 3 corrections de sécurité critiques identifiées lors de l'audit :

1. **getProductsByCategory** - Vérifie que chaque organisation ne voit que ses propres produits par catégorie
2. **updateProductsOrder** - Vérifie qu'une organisation ne peut modifier que l'ordre de ses propres produits
3. **exportProductsCSV** - Vérifie qu'une organisation n'exporte que ses propres produits

## 🚀 Exécution des Tests

### Depuis l'hôte (si Node.js installé)

```bash
cd backend
npm test
```

### Depuis le conteneur Docker

```bash
docker exec flexpos_backend npm test
```

### Mode Watch (développement)

```bash
npm run test:watch
```

### Avec couverture de code

```bash
npm test -- --coverage
```

## 📊 Résultats Attendus

```
PASS tests/controllers/productController.multiTenant.test.js
  ProductController - Isolation Multi-Tenant
    🔒 TEST 1: getProductsByCategory - Isolation Multi-Tenant
      ✓ Org1 ne doit voir QUE ses propres burgers
      ✓ Org2 ne doit voir QUE ses propres burgers
      ✓ Catégorie vide ne doit pas fuiter de données
    🔒 TEST 2: updateProductsOrder - Isolation Multi-Tenant
      ✓ Org1 peut modifier l'ordre de SES propres produits
      ✓ 🚨 CRITIQUE: Org1 NE PEUT PAS modifier l'ordre des produits de Org2
      ✓ Tentative de modification avec ID inexistant ne doit pas crasher
    🔒 TEST 3: exportProductsCSV - Isolation Multi-Tenant
      ✓ Org1 exporte SEULEMENT ses propres produits
      ✓ Org1 exporte ses produits filtrés par catégorie
      ✓ 🚨 CRITIQUE: Org2 n'exporte PAS les produits de Org1
    📊 Résumé des Tests d'Isolation
      ✓ Tous les tests d'isolation multi-tenant passent

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## ⚠️ Pré-requis

- PostgreSQL doit être accessible
- Base de données de test configurée (`pos_burger_test`)
- Variables d'environnement définies (voir `.env.test`)

## 🔧 Configuration

Les tests utilisent une base de données dédiée `pos_burger_test` pour éviter de polluer les données de développement.

Configuration dans `jest.config.js` :
- Timeout : 10 secondes par test
- Couverture minimale : 50%
- Environment : Node.js

## 📝 Ajouter de Nouveaux Tests

1. Créer un fichier `*.test.js` dans `tests/`
2. Utiliser la structure :

```javascript
describe('NomDuModule - Description', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  test('description du test', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## 🎯 Bonnes Pratiques

- Chaque test doit être **isolé** et **indépendant**
- Utiliser des données de test **déterministes**
- Nettoyer les données après chaque test
- Tester les **cas limites** et **erreurs**
- Nommer clairement les tests (what, when, expected)

## 🚨 Tests Critiques de Sécurité

Les tests multi-tenant sont **CRITIQUES** pour la sécurité. Ils doivent **TOUJOURS** passer avant un déploiement en production.

Si un test échoue :
1. **NE PAS déployer**
2. Identifier la régression
3. Corriger le code
4. Re-exécuter tous les tests
5. Déployer seulement si tous les tests passent

## 📊 Couverture de Code

Objectif : **80%** de couverture pour les contrôleurs critiques.

Voir le rapport détaillé après :
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## 🔗 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Sequelize Testing](https://sequelize.org/docs/v6/other-topics/testing/)

---

**Auteur :** FlexPOS Team
**Dernière mise à jour :** 19 novembre 2025
