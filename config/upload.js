const multer = require('multer');
const { galleryStorage, profileStorage } = require('./cloudinary');

/**
 * Multer instance configured for gallery image uploads with Cloudinary storage.
 * Includes 5MB file size limit and image-only file filtering.
 * @type {multer.Multer}
 */
const uploadGallery = multer({ 
  storage: galleryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * Multer instance configured for profile picture uploads with Cloudinary storage.
 * Includes 5MB file size limit and image-only file filtering.
 * @type {multer.Multer}
 */
const uploadProfile = multer({ 
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * Middleware for single gallery image uploads by regular users.
 * Expects a file with the field name 'photo'.
 * @type {multer.Middleware}
 */
const uploadSingle = uploadGallery.single('photo');

/**
 * Middleware for multiple gallery image uploads by administrators.
 * Allows up to 10 files with the field name 'photos'.
 * @type {multer.Middleware}
 */
const uploadMultiple = uploadGallery.array('photos', 10);

/**
 * Middleware for profile picture uploads.
 * Expects a single file with the field name 'profilePicture'.
 * @type {multer.Middleware}
 */
const uploadProfilePicture = uploadProfile.single('profilePicture');

module.exports = {
  uploadGallery,
  uploadSingle,
  uploadMultiple,
  uploadProfilePicture,
  uploadProfile
};