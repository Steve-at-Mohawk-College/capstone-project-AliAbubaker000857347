const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processProfilePicture(inputPath) {
  try {
    const outputPath = inputPath.replace(/(\.\w+)$/, '-processed$1');
    
    // Ensure the directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await sharp(inputPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Delete the original file
    fs.unlinkSync(inputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    // If processing fails, return the original path
    return inputPath;
  }
}

module.exports = { processProfilePicture };