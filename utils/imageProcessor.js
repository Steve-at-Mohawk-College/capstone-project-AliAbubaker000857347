const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processProfilePicture(filePath) {
  try {
    const processedFilePath = filePath.replace(path.extname(filePath), '-processed.jpg');
    
    await sharp(filePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 80,
        mozjpeg: true 
      })
      .toFile(processedFilePath);
    
    // Remove original file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return processedFilePath;
  } catch (error) {
    console.error('Error processing image:', error);
    // If processing fails, return original file
    return filePath;
  }
}

module.exports = { processProfilePicture };