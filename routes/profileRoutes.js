const express = require('express');
const path = require('path');
const fs = require('fs');
const { uploadProfile } = require('../config/upload-cloudinary');

const { query, queryOne } = require('../config/database');
const { 
  updateUserProfilePicture, 
  getUserProfileWithStats,
  updateUsername, 
  checkUserExistsExcludingCurrent,
  updateUserBio,
  updateBioModerationStatus,
  getUserBio,
  getUserProfile,
  updateUserEmail, 
  checkEmailExistsExcludingCurrent, 
  findById,
  getPendingEmail,           
  cancelPendingEmail,        
  verifyPendingEmail 
} = require('../models/userModel');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// POST /profile/bio - Update user bio
router.post('/bio', requireAuth, async (req, res) => {
  try {
    const { bio } = req.body;
    const userId = req.session.userId;
    const userRole = req.session.role;

    console.log("➡️ POST /profile/bio called");
    console.log("User ID:", userId, "Role:", userRole);
    console.log("Bio content:", bio);

    // Determine if bio requires moderation
    // For regular users, any bio update requires admin approval
    // For admins, no moderation needed
    const requiresModeration = userRole === 'regular';

    // Update bio and moderation status
    await updateUserBio(userId, bio);
    await updateBioModerationStatus(userId, requiresModeration);

    let message;
    if (requiresModeration) {
      message = 'Bio updated successfully! It will be visible after admin approval.';
    } else {
      message = 'Bio updated successfully!';
    }

    res.json({
      success: true,
      message: message,
      requiresModeration: requiresModeration
    });

  } catch (error) {
    console.error('Bio update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating bio: ' + error.message
    });
  }
});




// GET /profile/verify-email-change - Verify email change (for profile routes)
router.get('/verify-email-change', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).render('error', {
      title: 'Error',
      message: 'Invalid verification token.',
      error: {}
    });
  }

  try {
    // Find user by pending email token
    const user = await queryOne(
      'SELECT * FROM users WHERE pending_email_token = ? AND pending_email_expiry > NOW()',
      [token]
    );

    if (!user) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired verification token.',
        error: {}
      });
    }

    // Verify the pending email
    const result = await verifyPendingEmail(token);
    
    if (result.affectedRows === 0) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired verification token.',
        error: {}
      });
    }

    // Update session if user is logged in
    if (req.session && req.session.userId === user.user_id) {
      req.session.email = user.pending_email; // Now it's the actual email
    }
    
    res.render('verify', { 
      title: 'Email Changed Successfully - Pet Care',
      message: 'Your email has been successfully updated and verified!'
    });
  } catch (error) {
    console.error('Email change verification error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Database error during email verification.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});







// GET /profile/bio - Get user bio
router.get('/bio', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId || req.session.userId;
    const bioData = await getUserBio(userId);
    
    res.json({
      success: true,
      bio: bioData?.bio || '',
      requiresModeration: bioData?.bio_requires_moderation || false,
      isApproved: !bioData?.bio_requires_moderation
    });
  } catch (error) {
    console.error('Get bio error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching bio'
    });
  }
});

// POST /profile/username - Update username (for regular users)
router.post('/username', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.session.userId;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long'
      });
    }

    const trimmedUsername = username.trim();

    // Check if username already exists (excluding current user)
    const existingUser = await checkUserExistsExcludingCurrent(userId, trimmedUsername, null);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }

    // Update username
    await updateUsername(userId, trimmedUsername);

    // Update session
    req.session.username = trimmedUsername;

    res.json({
      success: true,
      message: 'Username updated successfully',
      newUsername: trimmedUsername
    });

  } catch (error) {
    console.error('Username update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating username'
    });
  }
});

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
      username: req.session.username,
      profilePicture: req.session.profilePicture, // Add this line
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


router.post('/picture', requireAuth, uploadProfile, async (req, res) => {
    try {
        console.log("➡️ POST /profile/picture route hit");
        console.log("Cloudinary result:", req.cloudinaryResult);
        console.log("User ID:", req.session.userId);

        if (!req.cloudinaryResult) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded or upload failed'
            });
        }

        const userId = req.session.userId;
        
        // Get Cloudinary URL - it's already processed and optimized
        const profilePictureUrl = req.cloudinaryResult.secure_url;
        
        console.log("Cloudinary URL:", profilePictureUrl);

        // Update database with Cloudinary URL
        await updateUserProfilePicture(userId, profilePictureUrl);

        // Update session
        req.session.profilePicture = profilePictureUrl;

        res.json({
            success: true,
            message: 'Profile picture updated successfully!',
            profilePicture: profilePictureUrl
        });

    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Error uploading profile picture: ' + error.message
        });
    }
});






// // Add this function to handle profile picture upload
// async function handleProfilePictureUpload(req, res) {
//     try {
//         console.log("➡️ handleProfilePictureUpload called");
//         console.log("File:", req.file);
//         console.log("User ID:", req.session.userId);

//         if (!req.file) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'No file uploaded'
//             });
//         }

//         const userId = req.session.userId;
        
//         // Process the image (resize, optimize)
//         const processedImagePath = await processProfilePicture(req.file.path);
//         console.log("Processed image path:", processedImagePath);

//         // Create web-accessible URL
//         const webPath = processedImagePath.replace(/^.*public[\\/]/, '');
//         const imageUrl = `/${webPath.replace(/\\/g, '/')}`;
        
//         console.log("Web path:", webPath);
//         console.log("Image URL:", imageUrl);

//         // Update database
//         await updateUserProfilePicture(userId, imageUrl);

//         // Update session
//         req.session.profilePicture = imageUrl;

//         res.json({
//             success: true,
//             message: 'Profile picture updated successfully!',
//             imageUrl: imageUrl
//         });

//     } catch (error) {
//         console.error('Profile picture upload error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Error uploading profile picture: ' + error.message
//         });
//     }
// }







// In routes/profile.js - UPDATE the email route
router.post('/email', requireAuth, async (req, res) => {
  let connection;
  
  try {
    const { email } = req.body;
    const userId = req.session.userId;
    const currentEmail = req.session.email;

    console.log("➡️ POST /profile/email called");
    console.log("User ID:", userId, "Current email:", currentEmail);
    console.log("New email:", email);

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Check if email is the same as current
    if (trimmedEmail === currentEmail) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a different email address'
      });
    }

    // Check if email already exists
    const existingUser = await checkEmailExistsExcludingCurrent(userId, trimmedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use by another account'
      });
    }

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set pending email
    await updateUserEmail(userId, trimmedEmail, verificationToken);

    // Send verification email
    const sendEmail = require('../email/sendVerification');
    const verificationLink = `${process.env.BASE_URL}/profile/verify-email-change?token=${verificationToken}`;

    try {
      const emailSent = await sendEmail(
        trimmedEmail, 
        verificationToken, 
        req.session.username, 
        verificationLink, 
        'email_change'
      );

      if (!emailSent) {
        console.error('Failed to send verification email');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Verification email sent! Please check your new email to confirm the change.',
      requiresVerification: true,
      pendingEmail: trimmedEmail
    });

  } catch (error) {
    console.error('Email update error:', error);
    
    if (error.message === 'EMAIL_IN_USE') {
      return res.status(400).json({
        success: false,
        error: 'Email already in use by another account'
      });
    }
    
    // Handle connection errors gracefully
    if (error.code === 'ER_USER_LIMIT_REACHED') {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Please try again in a moment.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error updating email: ' + error.message
    });
  }
});

// In routes/profile.js - UPDATE the pending email route
router.get('/email/pending', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Add timeout and retry logic with better error handling
    const getPendingEmailWithRetry = async (retries = 2) => { // Reduced retries
      for (let i = 0; i < retries; i++) {
        try {
          const result = await getPendingEmail(userId);
          return result;
        } catch (error) {
          if (error.code === 'ER_USER_LIMIT_REACHED' && i < retries - 1) {
            console.log(`Retrying pending email check... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Longer delay
            continue;
          }
          throw error;
        }
      }
    };
    
    const pendingEmail = await getPendingEmailWithRetry();
    
    res.json({
      success: true,
      hasPendingEmail: !!pendingEmail?.pending_email,
      pendingEmail: pendingEmail?.pending_email || null,
      expiresAt: pendingEmail?.pending_email_expiry || null
    });
  } catch (error) {
    console.error('Pending email status error:', error);
    
    // Don't crash the page if we can't check pending status
    // Return a safe default response
    res.json({
      success: true,
      hasPendingEmail: false,
      pendingEmail: null,
      expiresAt: null,
      _error: 'Unable to check pending email status at this time'
    });
  }
});
// POST /profile/email/cancel - Cancel pending email change
router.post('/email/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    await cancelPendingEmail(userId);
    
    res.json({
      success: true,
      message: 'Pending email change cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel pending email error:', error);
    res.status(500).json({
      success: false,
      error: 'Error cancelling pending email change'
    });
  }
});

































// GET /profile/email/status - Check email verification status
router.get('/email/status', requireAuth, async (req, res) => {
  try {
    const user = await findById(req.session.userId);
    
    res.json({
      success: true,
      isVerified: user.is_verified,
      email: user.email
    });
  } catch (error) {
    console.error('Email status error:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking email status'
    });
  }
});















// DELETE /profile/picture - Remove profile picture (Updated for Cloudinary)
router.delete('/picture', requireAuth, async (req, res) => {
  try {
    console.log("➡️ DELETE /profile/picture called");
    console.log("Session userId:", req.session.userId);

    // Set profile picture to null in database
    await updateUserProfilePicture(req.session.userId, null);
    
    // Clear from session
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


module.exports = router;