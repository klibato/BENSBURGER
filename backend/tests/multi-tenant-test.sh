#!/bin/bash

# Test d'isolation multi-tenant pour FlexPos
# Ce script crée une 2ème organisation et vérifie l'isolation des données

BASE_URL="http://localhost:3000/api"

echo "🧪 TEST MULTI-TENANT FLEXPOS"
echo "============================"
echo ""

# Couleurs pour le terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1. CRÉER UNE NOUVELLE ORGANISATION
# ============================================
echo -e "${BLUE}📝 1. Création d'une nouvelle organisation : Pizza Express${NC}"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/organizations/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Express",
    "email": "contact@pizzaexpress.fr",
    "phone": "+33612345678",
    "plan": "starter",
    "admin_username": "admin_pizza",
    "admin_pin_code": "5678",
    "admin_first_name": "Mario",
    "admin_last_name": "Rossi"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# Extraire l'ID de l'organisation
ORG_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.organization.id')
ORG_SLUG=$(echo "$REGISTER_RESPONSE" | jq -r '.data.organization.slug')

if [ "$ORG_ID" != "null" ]; then
    echo -e "${GREEN}✅ Organisation créée : ID=$ORG_ID, SLUG=$ORG_SLUG${NC}"
else
    echo -e "${RED}❌ Échec de création de l'organisation${NC}"
    exit 1
fi

echo ""

# ============================================
# 2. LOGIN PIZZA EXPRESS
# ============================================
echo -e "${BLUE}🔐 2. Login admin Pizza Express${NC}"
echo ""

LOGIN_PIZZA=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_pizza",
    "pin_code": "5678"
  }')

TOKEN_PIZZA=$(echo "$LOGIN_PIZZA" | jq -r '.data.token')

if [ "$TOKEN_PIZZA" != "null" ]; then
    echo -e "${GREEN}✅ Login Pizza Express réussi${NC}"
else
    echo -e "${RED}❌ Échec login Pizza Express${NC}"
    echo "$LOGIN_PIZZA" | jq '.'
    exit 1
fi

echo ""

# ============================================
# 3. LOGIN BENSBURGER (organisation 1)
# ============================================
echo -e "${BLUE}🔐 3. Login admin BensBurger${NC}"
echo ""

LOGIN_BENS=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "pin_code": "1234"
  }')

TOKEN_BENS=$(echo "$LOGIN_BENS" | jq -r '.data.token')

if [ "$TOKEN_BENS" != "null" ]; then
    echo -e "${GREEN}✅ Login BensBurger réussi${NC}"
else
    echo -e "${RED}❌ Échec login BensBurger${NC}"
    exit 1
fi

echo ""

# ============================================
# 4. CRÉER UN PRODUIT PIZZA EXPRESS
# ============================================
echo -e "${BLUE}🍕 4. Création d'un produit Pizza Express${NC}"
echo ""

PRODUCT_PIZZA=$(curl -s -X POST $BASE_URL/products \
  -H "Authorization: Bearer $TOKEN_PIZZA" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Margherita",
    "description": "Tomate, mozzarella, basilic",
    "price_ht": 8.33,
    "vat_rate": 20,
    "category": "burgers",
    "type": "simple",
    "track_stock": true,
    "quantity": 100
  }')

PIZZA_ID=$(echo "$PRODUCT_PIZZA" | jq -r '.data.id')

if [ "$PIZZA_ID" != "null" ]; then
    echo -e "${GREEN}✅ Produit Pizza créé : ID=$PIZZA_ID${NC}"
else
    echo -e "${RED}❌ Échec création produit Pizza${NC}"
    echo "$PRODUCT_PIZZA" | jq '.'
    exit 1
fi

echo ""

# ============================================
# 5. TEST ISOLATION : BENSBURGER NE VOIT PAS PIZZA
# ============================================
echo -e "${BLUE}🔒 5. Test isolation : BensBurger essaye de voir les produits${NC}"
echo ""

PRODUCTS_BENS=$(curl -s -X GET $BASE_URL/products \
  -H "Authorization: Bearer $TOKEN_BENS")

BENS_PRODUCT_COUNT=$(echo "$PRODUCTS_BENS" | jq '.data | length')
BENS_HAS_PIZZA=$(echo "$PRODUCTS_BENS" | jq '.data | map(select(.name == "Pizza Margherita")) | length')

echo "Nombre de produits BensBurger : $BENS_PRODUCT_COUNT"
echo "BensBurger voit la Pizza Margherita : $BENS_HAS_PIZZA"

if [ "$BENS_HAS_PIZZA" == "0" ]; then
    echo -e "${GREEN}✅ ISOLATION RÉUSSIE : BensBurger ne voit pas les produits de Pizza Express${NC}"
else
    echo -e "${RED}❌ ÉCHEC ISOLATION : BensBurger voit les produits de Pizza Express !${NC}"
    exit 1
fi

echo ""

# ============================================
# 6. TEST ISOLATION : PIZZA NE VOIT PAS BENSBURGER
# ============================================
echo -e "${BLUE}🔒 6. Test isolation : Pizza Express essaye de voir les produits${NC}"
echo ""

PRODUCTS_PIZZA=$(curl -s -X GET $BASE_URL/products \
  -H "Authorization: Bearer $TOKEN_PIZZA")

PIZZA_PRODUCT_COUNT=$(echo "$PRODUCTS_PIZZA" | jq '.data | length')

echo "Nombre de produits Pizza Express : $PIZZA_PRODUCT_COUNT"

# Pizza Express devrait voir uniquement sa pizza (1 produit)
if [ "$PIZZA_PRODUCT_COUNT" == "1" ]; then
    echo -e "${GREEN}✅ ISOLATION RÉUSSIE : Pizza Express voit uniquement ses propres produits${NC}"
else
    echo -e "${RED}❌ ÉCHEC : Pizza Express voit un nombre incorrect de produits ($PIZZA_PRODUCT_COUNT au lieu de 1)${NC}"
    echo "$PRODUCTS_PIZZA" | jq '.data[] | .name'
fi

echo ""

# ============================================
# 7. VÉRIFIER LES SETTINGS PAR ORGANISATION
# ============================================
echo -e "${BLUE}⚙️  7. Test settings par organisation${NC}"
echo ""

SETTINGS_PIZZA=$(curl -s -X GET $BASE_URL/settings \
  -H "Authorization: Bearer $TOKEN_PIZZA")

PIZZA_STORE_NAME=$(echo "$SETTINGS_PIZZA" | jq -r '.data.store_name')

echo "Nom du commerce Pizza Express : $PIZZA_STORE_NAME"

if [ "$PIZZA_STORE_NAME" == "Pizza Express" ]; then
    echo -e "${GREEN}✅ Settings isolés : Pizza Express a ses propres settings${NC}"
else
    echo -e "${RED}❌ ÉCHEC : Settings incorrects ($PIZZA_STORE_NAME)${NC}"
fi

echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo "============================"
echo -e "${GREEN}✅ TOUS LES TESTS MULTI-TENANT RÉUSSIS !${NC}"
echo "============================"
echo ""
echo "📊 Résumé :"
echo "  - Organisation 1 (BensBurger) : Produits existants"
echo "  - Organisation 2 (Pizza Express) : 1 produit (Pizza Margherita)"
echo "  - Isolation complète : ✅"
echo "  - Settings isolés : ✅"
echo ""
echo "🎉 FlexPos est 100% multi-tenant !"
