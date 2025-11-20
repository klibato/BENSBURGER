const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Créer le dossier uploads/products s'il n'existe pas
const uploadsDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration du storage multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom unique avec crypto
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}_${uniqueId}${extension}`;
    cb(null, filename);
  },
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Format de fichier non autorisé: ${file.mimetype}. ` +
          `Formats acceptés: JPEG, PNG, WebP, GIF`
      ),
      false
    );
  }
};

// Configuration multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

// Middleware pour un seul fichier
const uploadSingleImage = upload.single('image');

// Middleware pour plusieurs fichiers (jusqu'à 10)
const uploadMultipleImages = upload.array('images', 10);

// Helper pour supprimer une image du disque
const deleteImage = (imagePath) => {
  try {
    if (imagePath) {
      const fullPath = path.join(__dirname, '../../', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'image:', error);
    return false;
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
};
