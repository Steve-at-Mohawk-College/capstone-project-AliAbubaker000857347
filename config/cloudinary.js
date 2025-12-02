const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const stream = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// For gallery images - use consistent transformations
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
            crop: 'fill',  // Changed from 'limit' to 'fill'
            gravity: 'auto', // Automatically focus on important parts
            quality: 'auto:good' // Better quality compression
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

// For profile pictures
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
            crop: 'fill',  // Changed from 'thumb' to 'fill'
            gravity: 'face', // Focus on face if detected
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