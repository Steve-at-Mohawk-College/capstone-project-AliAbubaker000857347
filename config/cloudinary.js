const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const stream = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image to Cloudinary with gallery-optimized transformations.
 * Images are cropped to fill 1200x800 dimensions with auto gravity focus
 * and good quality compression.
 * 
 * @param {Buffer} buffer - The image buffer to upload
 * @param {string} folder - Subfolder within 'petcare/' to organize images
 * @param {string} filename - Name for the uploaded image file
 * @returns {Promise<Object>} Cloudinary upload result object
 */
const uploadToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `petcare/${folder}`,
        public_id: filename,
        resource_type: 'image',
        transformation: [
          { 
            width: 1200, 
            height: 800, 
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto:good'
          }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Uploads a profile picture to Cloudinary with face-optimized transformations.
 * Images are cropped to fill 400x400 dimensions with face detection gravity
 * and good quality compression. Filename includes unique timestamp and random suffix.
 * 
 * @param {Buffer} buffer - The profile image buffer to upload
 * @param {string} filename - Base name for the profile image
 * @returns {Promise<Object>} Cloudinary upload result object
 */
const uploadProfileToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const finalFilename = `profile-${filename}-${uniqueSuffix}`;
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'petcare/profile',
        public_id: finalFilename,
        resource_type: 'image',
        transformation: [
          { 
            width: 400, 
            height: 400, 
            crop: 'fill',
            gravity: 'face',
            quality: 'auto:good'
          }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadProfileToCloudinary
};