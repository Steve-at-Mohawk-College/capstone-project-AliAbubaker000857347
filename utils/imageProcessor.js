// utils/imageProcessor.js - ONEDRIVE COMPATIBLE VERSION
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processProfilePicture(inputPath) {
  try {
    // console.log('🖼️ Processing profile picture:', inputPath);
    
    // Check if we're in a OneDrive environment
    const isOneDrive = inputPath.includes('OneDrive');
    // console.log('📁 OneDrive detected:', isOneDrive);
    
    // For OneDrive, use a simpler approach without file deletion
    if (isOneDrive) {
      // console.log('🔄 Using OneDrive-compatible processing');
      
      // Create output path in the same directory
      const parsedPath = path.parse(inputPath);
      const outputPath = path.join(
        parsedPath.dir, 
        `${parsedPath.name}-processed${parsedPath.ext}`
      );
      
      // console.log('📁 Output path:', outputPath);
      
      // Process image but don't delete original
      await sharp(inputPath)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality: 80,
          mozjpeg: true 
        })
        .toFile(outputPath);

      // console.log('✅ Image processed successfully (OneDrive mode)');
      return outputPath;
    }
    
    // Normal processing for non-OneDrive environments
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(
      parsedPath.dir, 
      `${parsedPath.name}-processed${parsedPath.ext}`
    );
    
    // console.log('📁 Output path:', outputPath);
    
    // Process the image
    await sharp(inputPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 80,
        mozjpeg: true 
      })
      .toFile(outputPath);

    // console.log('✅ Image processed successfully');
    
    // Try to delete original file (may fail on OneDrive)
    try {
      if (fs.existsSync(inputPath) && inputPath !== outputPath) {
        fs.unlinkSync(inputPath);
        // console.log('🗑️ Original file deleted');
      }
    } catch (deleteError) {
      console.warn('⚠️ Could not delete original file (OneDrive sync):', deleteError.message);
    }
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Image processing failed:', error.message);
    
    // Always return the original path as fallback
    // console.log('🔄 Falling back to original file');
    return inputPath;
  }
}

module.exports = { processProfilePicture };