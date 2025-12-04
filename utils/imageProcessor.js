const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Processes a profile picture by resizing and converting it to JPEG format.
 * For OneDrive environments, preserves the original file to avoid sync conflicts.
 * For non-OneDrive environments, attempts to delete the original after processing.
 * 
 * @async
 * @function processProfilePicture
 * @param {string} inputPath - The file system path to the original image
 * @returns {Promise<string>} The path to the processed image (or original on failure)
 * @throws {Error} Propagates any Sharp processing errors (handled internally)
 */
async function processProfilePicture(inputPath) {
  try {
    const isOneDrive = inputPath.includes('OneDrive');
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-processed${parsedPath.ext}`);
    await sharp(inputPath).resize(400, 400, {fit: 'cover',position: 'center'}).jpeg({quality: 80,mozjpeg: true}).toFile(outputPath);
    if (!isOneDrive) {
      try {
        if (fs.existsSync(inputPath) && inputPath !== outputPath) {
          fs.unlinkSync(inputPath);
        }
      } catch (deleteError) {
        // console.warn('⚠️ Could not delete original file (OneDrive sync):', deleteError.message);
      }
    }
    return outputPath;
  } catch (error) {
    // console.error('❌ Image processing failed:', error.message);
    return inputPath;
  }
}

module.exports = { processProfilePicture };