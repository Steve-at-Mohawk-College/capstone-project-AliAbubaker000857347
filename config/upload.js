const multer = require('multer');
const { galleryStorage, profileStorage } = require('./cloudinary');

// Create multer instances
const uploadGallery = multer({ 
  storage: galleryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const uploadProfile = multer({ 
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// For single file uploads (regular users)
const uploadSingle = uploadGallery.single('photo');

// For multiple file uploads (admins)
const uploadMultiple = uploadGallery.array('photos', 10);

// For profile pictures specifically
const uploadProfilePicture = uploadProfile.single('profilePicture');

module.exports = {
  uploadGallery: uploadGallery, // Flexible instance
  uploadSingle,      // For regular user gallery uploads
  uploadMultiple,    // For admin bulk uploads
  uploadProfilePicture,     // For profile picture uploads
  uploadProfile: uploadProfile // Profile-specific instance
};