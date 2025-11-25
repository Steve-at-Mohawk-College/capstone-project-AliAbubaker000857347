const multer = require('multer');
const { uploadToCloudinary, uploadProfileToCloudinary } = require('./cloudinary');

// Simple memory storage (we'll upload to Cloudinary after multer processes the file)
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to handle Cloudinary upload after multer
const handleCloudinaryUpload = (folder) => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        return next();
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      let filename;
      
      if (folder === 'gallery') {
        if (req.session.role === 'admin' && req.files) {
          filename = 'gallery-admin-' + uniqueSuffix;
        } else {
          filename = 'gallery-user-' + req.session.userId + '-' + uniqueSuffix;
        }
      } else {
        filename = 'profile-' + req.session.userId + '-' + uniqueSuffix;
      }

      // Upload to Cloudinary
      const uploadFunction = folder === 'profile' ? uploadProfileToCloudinary : uploadToCloudinary;
      const result = await uploadFunction(req.file.buffer, folder, filename);
      
      // Store Cloudinary URL in request for the route handler to use
      req.cloudinaryResult = result;
      next();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      next(error);
    }
  };
};

// Export middleware combinations
const uploadGallery = [upload.single('photo'), handleCloudinaryUpload('gallery')];
const uploadProfile = [upload.single('profilePicture'), handleCloudinaryUpload('profile')];
const uploadMultipleGallery = [upload.array('photos', 10), handleCloudinaryUpload('gallery')];

module.exports = {
  uploadGallery,
  uploadProfile,
  uploadMultipleGallery,
  uploadSingle: uploadGallery, // alias for backward compatibility
  uploadProfilePicture: uploadProfile // alias for backward compatibility
};