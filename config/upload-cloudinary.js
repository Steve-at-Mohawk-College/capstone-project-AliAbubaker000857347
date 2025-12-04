const multer = require('multer');
const { uploadToCloudinary, uploadProfileToCloudinary } = require('./cloudinary');

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
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
 * Uploads gallery images to Cloudinary with role-based handling.
 * Admins can upload multiple files (up to 10), while regular users can upload single files.
 * All images are uploaded to the 'gallery' folder with appropriate naming conventions.
 * Upload results are attached to the request object for downstream processing.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const uploadGallery = (req, res, next) => {
  const isAdmin = req.session?.role === 'admin';
  
  if (isAdmin) {
    upload.array('photos', 10)(req, res, (err) => {
      if (err) return next(err);
      handleCloudinaryUpload(req, res, next, true);
    });
  } else {
    upload.single('photos')(req, res, (err) => {
      if (err) return next(err);
      handleCloudinaryUpload(req, res, next, false);
    });
  }
};

/**
 * Handles the actual Cloudinary upload process for gallery images.
 * Processes either single or multiple files based on the isMultiple flag.
 * Attaches results to request object: req.cloudinaryResult (single) or req.cloudinaryResults (multiple).
 * 
 * @param {Object} req - Express request object containing uploaded files
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {boolean} isMultiple - Whether multiple files are being processed (admin mode)
 */
async function handleCloudinaryUpload(req, res, next, isMultiple) {
  try {
    if (!isMultiple && !req.file) {
      return next();
    }
    
    if (isMultiple && (!req.files || req.files.length === 0)) {
      return next();
    }

    if (isMultiple && req.files) {
      req.cloudinaryResults = [];
      
      for (const file of req.files) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'gallery-admin-' + uniqueSuffix;
        
        const result = await uploadToCloudinary(file.buffer, 'gallery', filename);
        req.cloudinaryResults.push(result);
      }
    } else if (req.file) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'gallery-user-' + req.session.userId + '-' + uniqueSuffix;
      
      const result = await uploadToCloudinary(req.file.buffer, 'gallery', filename);
      req.cloudinaryResult = result;
    }
    
    next();
  } catch (error) {
    // console.error('Cloudinary upload error:', error);
    next(error);
  }
}

/**
 * Middleware for uploading profile pictures to Cloudinary.
 * Expects a single file with the field name 'profilePicture'.
 * Uploads to the 'profile' folder with user-specific naming.
 * Attaches result to request object: req.cloudinaryResult.
 * 
 * @type {Array} Express middleware array combining multer and upload handler
 */
const uploadProfile = [upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) return next();
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + req.session.userId + '-' + uniqueSuffix;
    
    const result = await uploadProfileToCloudinary(req.file.buffer, 'profile', filename);
    req.cloudinaryResult = result;
    next();
  } catch (error) {
    // console.error('Cloudinary profile upload error:', error);
    next(error);
  }
}];

module.exports = {
  uploadGallery,
  uploadProfile,
  uploadProfilePicture: uploadProfile
};