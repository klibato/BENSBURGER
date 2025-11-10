FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Exposer le port Vite
EXPOSE 5173

# Commande par défaut
CMD ["npm", "run", "dev", "--", "--host"]
