/**
 * ✅ P1-4: Chiffrement AES-256-GCM pour données sensibles (2FA secrets)
 *
 * Utilise crypto natif Node.js avec algorithme AES-256-GCM (Galois/Counter Mode)
 * - Authentification + Chiffrement (AEAD - Authenticated Encryption with Associated Data)
 * - Protection contre tampering (modification malveillante)
 * - IV (Initialization Vector) aléatoire pour chaque chiffrement
 */

const crypto = require('crypto');
const config = require('../config/env');

// Algorithme de chiffrement (AES-256-GCM recommandé par NIST)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Génère une clé de chiffrement à partir du secret JWT (ou variable d'env dédiée)
 * @returns {Buffer} Clé de 256 bits
 */
function getEncryptionKey() {
  // Utiliser JWT_SECRET comme base pour la clé de chiffrement
  // En production, il faudrait une variable d'env dédiée ENCRYPTION_KEY
  const secret = process.env.ENCRYPTION_KEY || config.jwt.secret;

  // Dériver une clé de 256 bits avec PBKDF2
  return crypto.pbkdf2Sync(secret, 'flexpos-2fa-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Chiffre une valeur avec AES-256-GCM
 * @param {string} text - Texte en clair à chiffrer
 * @returns {string} Format: iv:authTag:encrypted (base64)
 */
function encrypt(text) {
  if (!text) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (tous en base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Déchiffre une valeur chiffrée avec AES-256-GCM
 * @param {string} encryptedData - Format: iv:authTag:encrypted (base64)
 * @returns {string} Texte en clair
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = {
  encrypt,
  decrypt,
};
