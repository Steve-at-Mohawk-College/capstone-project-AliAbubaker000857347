const multer = require('multer');
const { uploadToCloudinary, uploadProfileToCloudinary } = require('./cloudinary');

// Simple memory storage
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

// Single upload middleware that handles both single and multiple based on user role
const uploadGallery = (req, res, next) => {
  const isAdmin = req.session?.role === 'admin';
  
  if (isAdmin) {
    // Admin: multiple files - use 'photos'
    upload.array('photos', 10)(req, res, (err) => {
      if (err) return next(err);
      handleCloudinaryUpload(req, res, next, true);
    });
  } else {
    // Regular user: single file - ALSO use 'photos' but as single
    upload.single('photos')(req, res, (err) => {  // Changed from 'photo' to 'photos'
      if (err) return next(err);
      handleCloudinaryUpload(req, res, next, false);
    });
  }
};

// Handle Cloudinary upload
async function handleCloudinaryUpload(req, res, next, isMultiple) {
  try {
    // For single file uploads
    if (!isMultiple && !req.file) {
      return next();
    }
    
    // For multiple file uploads
    if (isMultiple && (!req.files || req.files.length === 0)) {
      return next();
    }

    if (isMultiple && req.files) {
      // Handle multiple files for admins
      req.cloudinaryResults = [];
      
      for (const file of req.files) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'gallery-admin-' + uniqueSuffix;
        
        const result = await uploadToCloudinary(file.buffer, 'gallery', filename);
        req.cloudinaryResults.push(result);
      }
    } else if (req.file) {
      // Handle single file for regular users
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'gallery-user-' + req.session.userId + '-' + uniqueSuffix;
      
      const result = await uploadToCloudinary(req.file.buffer, 'gallery', filename);
      req.cloudinaryResult = result;
    }
    
    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    next(error);
  }
}

// Profile upload middleware
const uploadProfile = [upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) return next();
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + req.session.userId + '-' + uniqueSuffix;
    
    const result = await uploadProfileToCloudinary(req.file.buffer, 'profile', filename);
    req.cloudinaryResult = result;
    next();
  } catch (error) {
    console.error('Cloudinary profile upload error:', error);
    next(error);
  }
}];

module.exports = {
  uploadGallery,
  uploadProfile,
  uploadProfilePicture: uploadProfile
};