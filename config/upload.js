const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../public/uploads');
const profilePicsDir = path.join(uploadsDir, 'profile-pictures');
const galleryDir = path.join(uploadsDir, 'gallery');

[uploadsDir, profilePicsDir, galleryDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on route or user role
    if (req.originalUrl.includes('/gallery') && req.session.role === 'admin') {
      cb(null, galleryDir);
    } else if (req.originalUrl.includes('/gallery')) {
      cb(null, galleryDir);
    } else {
      cb(null, profilePicsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    
    // Generate filename based on context
    let filename;
    if (req.originalUrl.includes('/gallery')) {
      if (req.session.role === 'admin' && req.files) {
        // Admin bulk upload - use original name with unique suffix
        filename = 'gallery-admin-' + uniqueSuffix + fileExtension;
      } else {
        // Regular user gallery upload
        filename = 'gallery-user-' + req.session.userId + '-' + uniqueSuffix + fileExtension;
      }
    } else {
      // Profile picture upload (existing functionality)
      filename = 'profile-' + req.session.userId + '-' + uniqueSuffix + fileExtension;
    }
    
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer instances for different use cases
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Specific instances for different scenarios
const uploadSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single('photo'); // For single file uploads (regular users)

const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10 // Maximum 10 files for admin bulk upload
  }
}).array('photos', 10); // For multiple file uploads (admins)

const uploadProfile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single('profilePicture'); // For profile pictures specifically

module.exports = {
  // Main upload instance (flexible)
  upload,
  
  // Specific instances for different use cases
  uploadSingle,      // For regular user gallery uploads (single file)
  uploadMultiple,    // For admin bulk uploads (multiple files)
  uploadProfile,     // For profile picture uploads
  
  // Direct configuration for custom usage
  config: {
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  }
};