const HARDCODED_ADMIN_EMAIL = 'admin-petCare-2025@petcare.com';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createUser, findByEmail, findByUsername, verifyUser, findById } = require('../models/userModel');
const { queryOne, query } = require('../config/database'); // Make sure to import query
const sendEmail = require('../email/sendVerification');

const router = express.Router();

// GET /auth/forgot-password (show form)
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { 
    title: 'Forgot Password - Pet Care',
    error: null, 
    message: null 
  });
});

function requireAuth(req, res, next) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}



// POST /auth/extend-session - Extend user session
router.post('/extend-session', requireAuth, (req, res) => {
    // Simply reset the session maxAge
    req.session.cookie.maxAge = 10 * 60 * 1000; // Another 10 minutes
    req.session.touch();
    
    res.json({ success: true, message: 'Session extended' });
});

// Update logout route to handle timeout reason
router.post('/logout', (req, res) => {
    const reason = req.query.reason;
    
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
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


// POST /auth/forgot-password (process form)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await findByEmail(email);
    
    // For security, don't reveal if email exists or not
    if (!user || user.email === HARDCODED_ADMIN_EMAIL) {
      return res.render('forgot-password', { 
        title: 'Forgot Password - Pet Care',
        message: 'If an account with that email exists, a reset link has been sent.',
        error: null 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save token to database
    await query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?',
      [resetToken, new Date(resetTokenExpiry), user.user_id]
    );

    // Send email
    const resetLink = `${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`;
    await sendEmail(email, resetToken, user.username, resetLink, true);

    res.render('forgot-password', {
      title: 'Forgot Password - Pet Care',
      message: 'If an account with that email exists, a reset link has been sent.',
      error: null
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.render('forgot-password', {
      title: 'Forgot Password - Pet Care',
      error: 'An error occurred. Please try again.',
      message: null
    });
  }
});

// GET /auth/reset-password (show reset form)
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
    console.error('Reset password error:', error);
    res.render('reset-password', {
      title: 'Reset Password - Pet Care',
      error: 'An error occurred. Please try again.',
      token: null
    });
  }
});

// POST /auth/reset-password (process reset)
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password and clear reset token
    await query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = ?',
      [hashedPassword, user.user_id]
    );

    res.redirect('/login?message=Password reset successfully. Please login with your new password.');
  } catch (error) {
    console.error('Password reset error:', error);
    res.render('reset-password', {
      title: 'Reset Password - Pet Care',
      error: 'An error occurred. Please try again.',
      token
    });
  }
});




// POST /auth/register - UPDATED VERSION
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body || {};
  
  // Store form data to repopulate on error
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

    // Render success message on register page
    res.render('register', { 
      title: 'Register - Pet Care Management',
      message: 'Check your email to verify your account.',
      formData: {} // Clear form on success
    });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).render('register', { 
      title: 'Register - Pet Care Management',
      error: 'Server error during registration.',
      formData
    });
  }
});





// GET /auth/verify-email-change - Verify email change
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




// GET /auth/verify - Update to handle both registration and email change verification
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).render('error', {
    title: 'Error',
    message: 'Invalid token.',
    error: {}
  });
  
  try {
    // Find user by verification token
    const user = await queryOne('SELECT * FROM users WHERE verification_token = ?', [token]);
    
    if (!user) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired token.',
        error: {}
      });
    }

    // Verify the user
    const result = await verifyUser(token);
    
    if (result.affectedRows === 0) {
      return res.render('error', {
        title: 'Error',
        message: 'Invalid or expired token.',
        error: {}
      });
    }

    // Update session if user is logged in
    if (req.session && req.session.userId === user.user_id) {
      req.session.email = user.email;
    }
    
    res.render('verify', { 
      title: 'Email Verified - Pet Care',
      message: 'Your email has been successfully verified.'
    });
  } catch (e) {
    console.error('Verification error:', e);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Database error during verification.',
      error: process.env.NODE_ENV === 'development' ? e : {}
    });
  }
});



















// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password, isAdminLogin } = req.body || {};
  if (!email || !password) return res.status(400).send('Email and password required.');

  try {
    const user = await findByEmail(email);
    if (!user) return res.status(400).render('login', { 
      title: 'Login - Pet Care Management',
      error: 'Invalid credentials' 
    });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).render('login', { 
      title: 'Login - Pet Care Management',
      error: 'Wrong password' 
    });
    
    if (!user.is_verified && user.email !== HARDCODED_ADMIN_EMAIL) {
      return res.status(400).render('login', { 
        title: 'Login - Pet Care Management',
        error: 'Please verify your email first.' 
      });
    }

    // Auto-promote hardcoded admin email to admin role
    if (user.email === HARDCODED_ADMIN_EMAIL && user.role !== 'admin') {
      await query('UPDATE users SET role = "admin" WHERE user_id = ?', [user.user_id]);
      user.role = 'admin';
    }

    // Check if trying to access admin panel but not an admin
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



    // Redirect to admin dashboard if admin login or hardcoded admin
    if ((user.role === 'admin' && isAdminLogin) || user.email === HARDCODED_ADMIN_EMAIL) {
      return res.redirect('/admin/dashboard');
    }
    
    // Regular user login
    res.redirect('/dashboard');
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).render('login', { 
      title: 'Login - Pet Care Management',
      error: 'Database error during login.' 
    });
  }
});


// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Error logging out.',
        error: process.env.NODE_ENV === 'development' ? err : {}
      });
    }
    res.redirect('/login');
  });
});

// GET /auth/me (optional helper)
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ user: null });
  const me = await findById(req.session.userId);
  res.json({ user: me ? { id: me.user_id, username: me.username, email: me.email, role: me.role } : null });
});

module.exports = router;
