const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { fileTypeFromFile } = require('file-type'); // ✅ P1-5: Validation magic bytes
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
          `Formats acceptés: JPEG, PNG, WebP, GIF`,
      ),
      false,
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

/**
 * ✅ P1-5: Valide les magic bytes d'un fichier uploadé
 * Vérifie que le fichier est réellement une image (protection contre upload malveillant)
 * @param {Object} file - Fichier multer
 * @returns {Promise<boolean>} true si valide, false sinon
 */
const validateFileMagicBytes = async (file) => {
  if (!file || !file.path) return false;

  try {
    // Lire les magic bytes du fichier (premiers octets)
    const fileType = await fileTypeFromFile(file.path);

    if (!fileType) {
      logger.warn(`Magic bytes validation failed: Unknown file type for ${file.originalname}`);
      return false;
    }

    // Types d'images autorisés (basés sur les magic bytes réels)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(fileType.mime)) {
      logger.warn(
        `Magic bytes validation failed: ${file.originalname} ` +
          `detected as ${fileType.mime} (expected image format)`,
      );
      return false;
    }

    logger.debug(`Magic bytes validation passed: ${file.originalname} (${fileType.mime})`);
    return true;
  } catch (error) {
    logger.error('Error during magic bytes validation:', error);
    return false;
  }
};

/**
 * ✅ P1-5: Middleware wrapper qui valide les magic bytes après upload
 */
const uploadSingleImageWithValidation = async (req, res, next) => {
  uploadSingleImage(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    // Si aucun fichier uploadé, continuer
    if (!req.file) {
      return next();
    }

    // ✅ P1-5: Valider les magic bytes
    const isValid = await validateFileMagicBytes(req.file);

    if (!isValid) {
      // Supprimer le fichier malveillant
      deleteImage(`uploads/products/${req.file.filename}`);

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message:
            'Le fichier uploadé n\'est pas une image valide. ' +
            'Seuls JPEG, PNG, WebP et GIF sont acceptés.',
        },
      });
    }

    // Fichier valide, continuer
    next();
  });
};

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
  uploadSingleImage: uploadSingleImageWithValidation, // ✅ P1-5: Utiliser version avec validation
  uploadMultipleImages,
  deleteImage,
};
