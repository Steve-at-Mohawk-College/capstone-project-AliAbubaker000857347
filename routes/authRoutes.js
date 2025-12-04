const HARDCODED_ADMIN_EMAIL = 'admin-petCare-2025@petcare.com';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createUser, findByEmail, findByUsername, verifyUser, findById } = require('../models/userModel');
const { queryOne, query } = require('../config/database');
const sendEmail = require('../email/sendVerification');

const router = express.Router();

/**
 * GET /auth/forgot-password - Renders forgot password form.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', {
    title: 'Forgot Password - Pet Care',
    error: null,
    message: null
  });
});

/**
 * Middleware to require authentication for protected routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

/**
 * POST /auth/extend-session - Extends user session by resetting cookie maxAge.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/extend-session', requireAuth, (req, res) => {
  req.session.cookie.maxAge = 10 * 60 * 1000;
  req.session.touch();

  res.json({ success: true, message: 'Session extended' });
});

/**
 * POST /auth/logout - Handles user logout with session timeout reason.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/logout', (req, res) => {
  const reason = req.query.reason;

  req.session.destroy(err => {
    if (err) {
      // console.error('Logout error:', err);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Error logging out.',
        error: process.env.NODE_ENV === 'development' ? err : {}
      });
    }

    if (reason === 'timeout') {
      res.redirect('/login?message=Your session has expired due to inactivity. Please login again.');
    } else {
      res.redirect('/login');
    }
  });
});

/**
 * POST /auth/forgot-password - Processes forgot password request.
 * Generates reset token and sends email if user exists.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findByEmail(email);

    if (!user || user.email === HARDCODED_ADMIN_EMAIL) {
      return res.render('forgot-password', {
        title: 'Forgot Password - Pet Care',
        message: 'If an account with that email exists, a reset link has been sent.',
        error: null
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;

    await query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?',
      [resetToken, new Date(resetTokenExpiry), user.user_id]
    );

    const resetLink = `${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`;
    await sendEmail(email, resetToken, user.username, resetLink, true);

    res.render('forgot-password', {
      title: 'Forgot Password - Pet Care',
      message: 'If an account with that email exists, a reset link has been sent.',
      error: null
    });
  } catch (error) {
    // console.error('Password reset error:', error);
    res.render('forgot-password', {
      title: 'Forgot Password - Pet Care',
      error: 'An error occurred. Please try again.',
      message: null
    });
  }
});

/**
 * GET /auth/reset-password - Renders password reset form with token validation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/reset-password', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.redirect('/auth/forgot-password');
  }

  try {
    const user = await queryOne(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (!user) {
      return res.render('reset-password', {
        title: 'Reset Password - Pet Care',
        error: 'Invalid or expired reset token.',
        token: null
      });
    }

    res.render('reset-password', {
      title: 'Reset Password - Pet Care',
      error: null,
      token
    });
  } catch (error) {
    // console.error('Reset password error:', error);
    res.render('reset-password', {
      title: 'Reset Password - Pet Care',
      error: 'An error occurred. Please try again.',
      token: null
    });
  }
});

/**
 * POST /auth/reset-password - Processes password reset with token validation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await queryOne(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (!user) {
      return res.render('reset-password', {
        title: 'Reset Password - Pet Care',
        error: 'Invalid or expired reset token.',
        token: null
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = ?',
      [hashedPassword, user.user_id]
    );

    res.redirect('/login?message=Password reset successfully. Please login with your new password.');
  } catch (error) {
    // console.error('Password reset error:', error);
    res.render('reset-password', {
      title: 'Reset Password - Pet Care',
      error: 'An error occurred. Please try again.',
      token
    });
  }
});

/**
 * POST /auth/register - Registers a new user account.
 * Validates input, checks for existing users, creates account, and sends verification email.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body || {};
  const formData = { email, username };

  if (!email || !password || !username) {
    return res.status(400).render('register', {
      title: 'Register - Pet Care Management',
      error: 'Email, password, and username are required.',
      formData
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).render('register', {
      title: 'Register - Pet Care Management',
      error: 'Please enter a valid email address.',
      formData
    });
  }

  if (password.length < 8) {
    return res.status(400).render('register', {
      title: 'Register - Pet Care Management',
      error: 'Password must be at least 8 characters long.',
      formData
    });
  }

  try {
    const existing = await queryOne('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing) {
      const error = existing.email === email ? 'Email already in use.' : 'Username already taken.';
      return res.status(400).render('register', {
        title: 'Register - Pet Care Management',
        error: error,
        formData
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    await createUser(username, email, hash, token);
    await sendEmail(email, token, username);

    res.render('register', {
      title: 'Register - Pet Care Management',
      message: 'Check your email to verify your account.',
      formData: {}
    });
  } catch (e) {
    // console.error('Registration error:', e);
    res.status(500).render('register', {
      title: 'Register - Pet Care Management',
      error: 'Server error during registration.',
      formData
    });
  }
});

/**
 * GET /auth/verify-email-change - Verifies email change using pending email token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
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
    // console.error('Email change verification error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Database error during email verification.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /auth/verify - Verifies user email registration using verification token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).render('error', {
    title: 'Error',
    message: 'Invalid token.',
    error: {}
  });

  try {
    const user = await queryOne('SELECT * FROM users WHERE verification_token = ?', [token]);

    if (!user) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired token.',
        error: {}
      });
    }

    const result = await verifyUser(token);

    if (result.affectedRows === 0) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired token.',
        error: {}
      });
    }

    if (req.session && req.session.userId === user.user_id) {
      req.session.email = user.email;
    }

    res.render('verify', {
      title: 'Email Verified - Pet Care',
      message: 'Your email has been successfully verified.'
    });
  } catch (e) {
    // console.error('Verification error:', e);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Database error during verification.',
      error: process.env.NODE_ENV === 'development' ? e : {}
    });
  }
});

/**
 * POST /auth/login - Authenticates user credentials and establishes session.
 * Handles regular user and admin login with appropriate redirects.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/login', async (req, res) => {
  const { email, password, isAdminLogin } = req.body || {};
  if (!email || !password) return res.status(400).send('Email and password required.');

  try {
    const user = await findByEmail(email);
    if (!user) return res.status(400).render('login', {
      title: 'Login - Pet Care Management',
      error: 'Invalid credentials or Password'
    });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).render('login', {
      title: 'Login - Pet Care Management',
      error: 'Invalid credentials or Password'
    });

    if (!user.is_verified && user.email !== HARDCODED_ADMIN_EMAIL) {
      return res.status(400).render('login', {
        title: 'Login - Pet Care Management',
        error: 'Please verify your email first.'
      });
    }

    if (user.email === HARDCODED_ADMIN_EMAIL && user.role !== 'admin') {
      await query('UPDATE users SET role = "admin" WHERE user_id = ?', [user.user_id]);
      user.role = 'admin';
    }

    if (isAdminLogin && user.role !== 'admin') {
      return res.status(403).render('login', {
        title: 'Login - Pet Care Management',
        error: 'Access denied. Admin privileges required.'
      });
    }

    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.email = user.email;
    req.session.profilePicture = user.profile_picture_url;

    if ((user.role === 'admin' && isAdminLogin) || user.email === HARDCODED_ADMIN_EMAIL) {
      return res.redirect('/admin/dashboard');
    }

    res.redirect('/dashboard');
  } catch (e) {
    // console.error('Login error:', e);
    res.status(500).render('login', {
      title: 'Login - Pet Care Management',
      error: 'Database error during login.'
    });
  }
});

/**
 * GET /auth/me - Returns current authenticated user information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ user: null });
  const me = await findById(req.session.userId);
  res.json({ user: me ? { id: me.user_id, username: me.username, email: me.email, role: me.role } : null });
});

module.exports = router;