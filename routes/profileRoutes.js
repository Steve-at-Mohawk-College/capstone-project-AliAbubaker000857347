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

/**
 * Middleware function that checks if a user is authenticated.
 * If authenticated, proceeds to the next middleware/route handler.
 * Otherwise, redirects to the login page.
 *
 * @function requireAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

/**
 * POST /profile/bio
 * Updates the user's biography text.
 * Regular users require admin approval for bio updates, while admins can update without moderation.
 *
 * @name POST /profile/bio
 * @function
 * @memberof module:routes/profileRoute
 * @param {string} req.body.bio - The new biography text
 * @returns {Object} JSON response with success status and message
 */
router.post('/bio', requireAuth, async (req, res) => {
  try {
    const { bio } = req.body;
    const userId = req.session.userId;
    const userRole = req.session.role;

    const requiresModeration = userRole === 'regular';
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

    res.status(500).json({
      success: false,
      error: 'Error updating bio: ' + error.message
    });
  }
});

/**
 * GET /profile/verify-email-change
 * Verifies an email change request using a verification token.
 * Updates the user's email in the database and session upon successful verification.
 *
 * @name GET /profile/verify-email-change
 * @function
 * @memberof module:routes/profileRoute
 * @param {string} req.query.token - Email verification token
 */
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
    const result = await verifyPendingEmail(token);
    if (result.affectedRows === 0) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired verification token.',
        error: {}
      });
    }
    if (req.session && req.session.userId === user.user_id) {
      req.session.email = user.pending_email;
    }
    res.render('verify', {
      title: 'Email Changed Successfully - Pet Care',
      message: 'Your email has been successfully updated and verified!'
    });
  } catch (error) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Database error during email verification.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /profile/bio
 * Retrieves the current user's biography text and moderation status.
 *
 * @name GET /profile/bio
 * @function
 * @memberof module:routes/profileRoute
 * @returns {Object} JSON response with bio content and moderation status
 */
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

    res.status(500).json({
      success: false,
      error: 'Error fetching bio'
    });
  }
});

/**
 * POST /profile/username
 * Updates the user's username with validation for uniqueness and length.
 * Updates the session with the new username upon successful update.
 *
 * @name POST /profile/username
 * @function
 * @memberof module:routes/profileRoute
 * @param {string} req.body.username - New username (minimum 3 characters)
 * @returns {Object} JSON response with success status and new username
 */
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
    const existingUser = await checkUserExistsExcludingCurrent(userId, trimmedUsername, null);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }
    await updateUsername(userId, trimmedUsername);
    req.session.username = trimmedUsername;
    res.json({
      success: true,
      message: 'Username updated successfully',
      newUsername: trimmedUsername
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Error updating username'
    });
  }
});

/**
 * GET /profile
 * Renders the user's profile page with statistics and user information.
 *
 * @name GET /profile
 * @function
 * @memberof module:routes/profileRoute
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userProfile = await getUserProfileWithStats(req.session.userId);

    res.render('profile', {
      title: 'My Profile - Pet Care',
      user: userProfile,
      username: req.session.username,
      profilePicture: req.session.profilePicture,
      error: null,
      message: null
    });
  } catch (error) {

    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading profile.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * POST /profile/picture
 * Uploads and updates the user's profile picture using Cloudinary storage.
 * Updates both the database and user session with the new picture URL.
 *
 * @name POST /profile/picture
 * @function
 * @memberof module:routes/profileRoute
 * @returns {Object} JSON response with success status and new profile picture URL
 */
router.post('/picture', requireAuth, uploadProfile, async (req, res) => {
  try {

    if (!req.cloudinaryResult) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or upload failed'
      });
    }
    const userId = req.session.userId;
    const user = await findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    const profilePictureUrl = req.cloudinaryResult.secure_url;

    const updateResult = await updateUserProfilePicture(userId, profilePictureUrl);
    if (updateResult.affectedRows === 0) {
      throw new Error('Failed to update profile picture in database');
    }
    req.session.profilePicture = profilePictureUrl;
    req.session.touch();
    req.session.save((err) => {
      if (err) {

        return res.status(500).json({
          success: false,
          error: 'Error updating session'
        });
      }

      res.json({
        success: true,
        message: 'Profile picture updated successfully!',
        profilePicture: profilePictureUrl,
        timestamp: Date.now()
      });
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Error uploading profile picture: ' + error.message
    });
  }
});

/**
 * POST /profile/email
 * Initiates an email change request with email validation and uniqueness checking.
 * Sends a verification email to the new email address for confirmation.
 *
 * @name POST /profile/email
 * @function
 * @memberof module:routes/profileRoute
 * @param {string} req.body.email - New email address
 * @returns {Object} JSON response with success status and verification information
 */
router.post('/email', requireAuth, async (req, res) => {
  let connection;
  try {
    const { email } = req.body;
    const userId = req.session.userId;
    const currentEmail = req.session.email;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }
    if (trimmedEmail === currentEmail) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a different email address'
      });
    }
    const existingUser = await checkEmailExistsExcludingCurrent(userId, trimmedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use by another account'
      });
    }
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await updateUserEmail(userId, trimmedEmail, verificationToken);
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

      }
    } catch (emailError) {

    }
    res.json({
      success: true,
      message: 'Verification email sent! Please check your new email to confirm the change.',
      requiresVerification: true,
      pendingEmail: trimmedEmail
    });
  } catch (error) {

    if (error.message === 'EMAIL_IN_USE') {
      return res.status(400).json({
        success: false,
        error: 'Email already in use by another account'
      });
    }
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

/**
 * GET /profile/email/pending
 * Checks if the user has a pending email change request and returns its status.
 * Includes retry logic for database connection issues.
 *
 * @name GET /profile/email/pending
 * @function
 * @memberof module:routes/profileRoute
 * @returns {Object} JSON response with pending email information
 */
router.get('/email/pending', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const getPendingEmailWithRetry = async (retries = 2) => {
      for (let i = 0; i < retries; i++) {
        try {
          const result = await getPendingEmail(userId);
          return result;
        } catch (error) {
          if (error.code === 'ER_USER_LIMIT_REACHED' && i < retries - 1) {

            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
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

    res.json({
      success: true,
      hasPendingEmail: false,
      pendingEmail: null,
      expiresAt: null,
      _error: 'Unable to check pending email status at this time'
    });
  }
});

/**
 * POST /profile/email/cancel
 * Cancels a pending email change request for the user.
 *
 * @name POST /profile/email/cancel
 * @function
 * @memberof module:routes/profileRoute
 * @returns {Object} JSON response with success status
 */
router.post('/email/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    await cancelPendingEmail(userId);
    res.json({
      success: true,
      message: 'Pending email change cancelled successfully'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Error cancelling pending email change'
    });
  }
});

/**
 * GET /profile/email/status
 * Checks the verification status of the user's current email.
 *
 * @name GET /profile/email/status
 * @function
 * @memberof module:routes/profileRoute
 * @returns {Object} JSON response with email verification status
 */
router.get('/email/status', requireAuth, async (req, res) => {
  try {
    const user = await findById(req.session.userId);
    res.json({
      success: true,
      isVerified: user.is_verified,
      email: user.email
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Error checking email status'
    });
  }
});

/**
 * DELETE /profile/picture
 * Removes the user's profile picture from both database and session.
 *
 * @name DELETE /profile/picture
 * @function
 * @memberof module:routes/profileRoute
 * @returns {Object} JSON response with success status
 */
router.delete('/picture', requireAuth, async (req, res) => {
  try {

    await updateUserProfilePicture(req.session.userId, null);
    req.session.profilePicture = null;
    res.json({
      success: true,
      message: 'Profile picture removed successfully'
    });
  } catch (error) {

    res.status(500).json({ error: 'Error removing profile picture' });
  }
});

module.exports = router;