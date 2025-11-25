const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const stream = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `petcare/${folder}`,
        public_id: filename,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result);
        }
      }
    );
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

const uploadProfileToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'petcare/profile',
        public_id: filename,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'thumb', gravity: 'face', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary profile upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary profile upload success:', result.secure_url);
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