const express = require('express');
const path = require('path');
const upload = require('../config/upload');
const { updateUserProfilePicture, getUserProfileWithStats } = require('../models/userModel');
const { processProfilePicture } = require('../utils/imageProcessor');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// GET /profile - Profile page
router.get('/', requireAuth, async (req, res) => {
  try {
    const userProfile = await getUserProfileWithStats(req.session.userId);

    console.log("➡️ GET /profile called");
    console.log("Session userId:", req.session.userId);
    console.log("User profile:", userProfile);

    res.render('profile', {
      title: 'My Profile - Pet Care',
      user: userProfile,
      error: null,
      message: null
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading profile.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// POST /profile/picture - Upload profile picture
router.post('/picture', requireAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log("➡️ POST /profile/picture called");
    console.log("Session userId:", req.session.userId);
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded or file too large' 
      });
    }

    // Process the image
    let processedFilePath;
    try {
      processedFilePath = await processProfilePicture(req.file.path);
    } catch (processError) {
      console.error('Image processing error:', processError);
      // Use original file if processing fails
      processedFilePath = req.file.path;
    }

    // Get relative path for web access
    const relativePath = path.relative(
      path.join(__dirname, '../public'), 
      processedFilePath
    ).replace(/\\/g, '/'); // Convert backslashes to forward slashes for web

    const webPath = '/' + relativePath;

    // Update DB
    await updateUserProfilePicture(req.session.userId, webPath);

    // Update session
    req.session.profilePicture = webPath;
    
    console.log('Profile picture updated successfully:', webPath);

    res.json({ 
      success: true, 
      message: 'Profile picture updated successfully',
      imageUrl: webPath
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error uploading profile picture: ' + error.message 
    });
  }
});
// DELETE /profile/picture - Remove profile picture
router.delete('/picture', requireAuth, async (req, res) => {
  try {
    console.log("➡️ DELETE /profile/picture called");
    console.log("Session userId:", req.session.userId);

    await updateUserProfilePicture(req.session.userId, null);
    req.session.profilePicture = null;

    res.json({ 
      success: true, 
      message: 'Profile picture removed successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Error removing profile picture' });
  }
});

// GET /profile/debug - Debug endpoint
router.get('/debug', requireAuth, async (req, res) => {
  try {
    const user = await getUserProfile(req.session.userId);
    
    // Check upload directory
    const uploadsDir = path.join(__dirname, '../public/uploads');
    const profilePicsDir = path.join(uploadsDir, 'profile-pictures');
    
    res.json({
      session: {
        userId: req.session.userId,
        profilePicture: req.session.profilePicture
      },
      user: user,
      directories: {
        uploads: {
          path: uploadsDir,
          exists: fs.existsSync(uploadsDir),
          writable: fs.accessSync ? (() => {
            try { fs.accessSync(uploadsDir, fs.constants.W_OK); return true; } 
            catch { return false; }
          })() : 'unknown'
        },
        profilePics: {
          path: profilePicsDir,
          exists: fs.existsSync(profilePicsDir),
          writable: fs.accessSync ? (() => {
            try { fs.accessSync(profilePicsDir, fs.constants.W_OK); return true; } 
            catch { return false; }
          })() : 'unknown'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
