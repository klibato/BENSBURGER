FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 5174

# Démarrer Vite en mode dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
