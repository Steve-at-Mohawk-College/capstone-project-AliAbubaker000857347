const express = require('express');
const { query, queryOne } = require('../config/database');
const router = express.Router();
const {
  updateUsername,
  checkUserExistsExcludingCurrent,
  updateUserBio,
  updateBioModerationStatus
} = require('../models/userModel');
const { uploadMultiple } = require('../config/upload');

/**
 * Middleware to require admin privileges for accessing routes.
 * Checks session role and returns 403 if user is not an admin.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin') return next();
  return res.status(403).render('error', {
    title: 'Access Denied',
    message: 'Admin privileges required to access this page.'
  });
}

/**
 * GET /admin/gallery - Renders gallery management page for administrators.
 * Shows all photos with pagination and pending tag approvals.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/gallery', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 12;
    const filters = {
      search: req.query.search,
      current_user_id: req.session.userId
    };

    const photos = await photoModel.getPublicPhotos(page, limit, { ...filters, includeAll: true });
    const pendingTags = await query('SELECT * FROM tags WHERE is_approved = 0');

    res.render('admin/gallery', {
      title: 'Gallery Management - Admin',
      photos,
      pendingTags,
      currentPage: page,
      currentSearch: req.query.search,
      hasMore: photos.length === limit
    });
  } catch (error) {
    // console.error('Admin gallery error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading gallery management.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /admin/gallery/bulk-upload - Renders bulk upload page for administrators.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/gallery/bulk-upload', requireAdmin, (req, res) => {
  res.render('admin/bulk-upload', {
    title: 'Bulk Upload - Admin'
  });
});

/**
 * POST /admin/gallery/bulk-upload - Handles bulk photo uploads by administrators.
 * Processes multiple files and applies tags if provided.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/gallery/bulk-upload', requireAdmin, (req, res, next) => {
  uploadMultiple(req, res, function (err) {
    if (err) {
      return res.status(400).render('admin/bulk-upload', {
        title: 'Bulk Upload - Admin',
        error: err.message
      });
    }
    handleBulkUpload(req, res);
  });
});

/**
 * Processes bulk upload of multiple photos.
 * Creates photo records and applies tags to each uploaded photo.
 * 
 * @param {Object} req - Express request object with uploaded files
 * @param {Object} res - Express response object
 */
async function handleBulkUpload(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).render('admin/bulk-upload', {
        title: 'Bulk Upload - Admin',
        error: 'Please select photos to upload.'
      });
    }

    const { title, description, tags } = req.body;
    const results = [];

    for (const file of req.files) {
      try {
        const photoId = await photoModel.createPhoto({
          user_id: req.session.userId,
          photo_url: `/uploads/gallery/${file.filename}`,
          title: title || `Admin Upload - ${file.originalname}`,
          description: description || '',
          is_public: 1
        });

        if (tags) {
          const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          for (const tagName of tagList) {
            try {
              await photoModel.addTagToPhoto(photoId, tagName, req.session.userId);
            } catch (tagError) {
              // console.log('Tag error:', tagError.message);
            }
          }
        }

        results.push({ success: true, file: file.originalname });
      } catch (error) {
        results.push({ success: false, file: file.originalname, error: error.message });
      }
    }

    res.render('admin/bulk-upload', {
      title: 'Bulk Upload - Admin',
      message: `Uploaded ${req.files.length} photos`,
      results
    });
  } catch (error) {
    // console.error('Bulk upload error:', error);
    res.status(500).render('admin/bulk-upload', {
      title: 'Bulk Upload - Admin',
      error: 'Error during bulk upload: ' + error.message
    });
  }
}

/**
 * POST /admin/tags/:id/approve - Approves a pending tag for public use.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/tags/:id/approve', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE tags SET is_approved = 1 WHERE tag_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Tag approved successfully' });
  } catch (error) {
    // console.error('Approve tag error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/tags/:id/reject - Rejects and deletes a pending tag.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/tags/:id/reject', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM tags WHERE tag_id = ? AND is_approved = 0', [req.params.id]);
    res.json({ success: true, message: 'Tag rejected successfully' });
  } catch (error) {
    // console.error('Reject tag error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/gallery/photo/:id/delete - Deletes a photo from the gallery.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/gallery/photo/:id/delete', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM photos WHERE photo_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    // console.error('Admin delete photo error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /admin/pending-bios - Renders page with user bios pending moderation.
 * Shows users with bios that require administrative approval.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/pending-bios', requireAdmin, async (req, res) => {
  try {
    const pendingBios = await query(`
            SELECT 
                u.user_id,
                u.username,
                u.email,
                u.bio,
                u.created_at,
                u.bio_requires_moderation,
                COUNT(p.pet_id) as pet_count
            FROM users u
            LEFT JOIN pets p ON u.user_id = p.user_id
            WHERE u.bio IS NOT NULL AND u.bio_requires_moderation = true
            GROUP BY u.user_id, u.username, u.email, u.bio, u.created_at, u.bio_requires_moderation
            ORDER BY u.created_at DESC
        `);

    res.render('admin/pending-bios', {
      title: 'Pending Bio Approvals',
      users: pendingBios
    });
  } catch (error) {
    // console.error('Pending bios error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading pending bios.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * POST /admin/users/:id/bio - Updates a user's bio as an administrator.
 * Admin updates bypass moderation and automatically mark bio as approved.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/users/:id/bio', requireAdmin, async (req, res) => {
  try {
    const { bio } = req.body;
    const targetUserId = req.params.id;

    await updateUserBio(targetUserId, bio);
    await updateBioModerationStatus(targetUserId, false);

    res.json({
      success: true,
      message: 'Bio updated successfully!'
    });

  } catch (error) {
    // console.error('Admin bio update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating bio: ' + error.message
    });
  }
});

/**
 * POST /admin/users/:id/bio/approve - Approves a user's pending bio.
 * Removes the moderation requirement for the specified user's bio.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/users/:id/bio/approve', requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    await updateBioModerationStatus(targetUserId, false);

    res.json({
      success: true,
      message: 'Bio approved successfully!'
    });

  } catch (error) {
    // console.error('Bio approval error:', error);
    res.status(500).json({
      success: false,
      error: 'Error approving bio'
    });
  }
});

/**
 * GET /admin/users-with-pending-bios - Retrieves users with bios pending moderation.
 * Returns JSON data for users whose bios require administrative approval.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/users-with-pending-bios', requireAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT user_id, username, email, bio, created_at 
      FROM users 
      WHERE bio_requires_moderation = TRUE 
      AND bio IS NOT NULL 
      AND bio != ''
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    // console.error('Get pending bios error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching users with pending bios'
    });
  }
});

/**
 * POST /admin/users/:id/username - Updates a user's username as an administrator.
 * Validates username length and uniqueness before updating.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/users/:id/username', requireAdmin, async (req, res) => {
  try {
    const { username } = req.body;
    const targetUserId = req.params.id;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long'
      });
    }

    const trimmedUsername = username.trim();

    const existingUser = await checkUserExistsExcludingCurrent(targetUserId, trimmedUsername, null);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }

    await updateUsername(targetUserId, trimmedUsername);

    res.json({
      success: true,
      message: 'Username updated successfully',
      newUsername: trimmedUsername
    });

  } catch (error) {
    // console.error('Admin username update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating username'
    });
  }
});

/**
 * GET /admin/dashboard - Renders the main administrator dashboard.
 * Displays system statistics, recent users, and pending posts for approval.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [userCount, petCount, taskCount, postCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM pets'),
      query('SELECT COUNT(*) as count FROM tasks'),
      query('SELECT COUNT(*) as count FROM community_posts')
    ]);

    const recentUsers = await query(`
      SELECT user_id, username, email, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    const pendingPosts = await query(`
      SELECT p.post_id, p.title, u.username, p.created_at 
      FROM community_posts p 
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.is_approved = FALSE 
      ORDER BY p.created_at DESC
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      userCount: userCount[0].count,
      petCount: petCount[0].count,
      taskCount: taskCount[0].count,
      postCount: postCount[0].count,
      recentUsers,
      pendingPosts,
      profilePicture: req.session.profilePicture,
      username: req.session.username
    });
  } catch (error) {
    // console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading admin dashboard.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /admin/users - Renders user management page for administrators.
 * Displays all users with their roles and moderation status.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        user_id, 
        username, 
        email, 
        role, 
        is_verified, 
        bio,
        bio_requires_moderation,
        created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    res.render('admin/users', {
      title: 'User Management',
      users
    });
  } catch (error) {
    // console.error('User management error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading user management.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * GET /admin/posts - Renders post moderation page for administrators.
 * Displays all community posts with approval status.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await query(`
      SELECT p.post_id, p.title, p.content, p.is_approved, u.username, p.created_at 
      FROM community_posts p 
      JOIN users u ON p.user_id = u.user_id 
      ORDER BY p.created_at DESC
    `);

    res.render('admin/posts', {
      title: 'Post Moderation',
      posts
    });
  } catch (error) {
    // console.error('Post moderation error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading post moderation.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * POST /admin/posts/:id/approve - Approves a pending community post.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/posts/:id/approve', requireAdmin, async (req, res) => {
  try {
    const result = await query('UPDATE community_posts SET is_approved = TRUE WHERE post_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    // console.error('Approve post error:', error);
    res.status(500).json({ success: false, error: 'Error approving post' });
  }
});

/**
 * POST /admin/posts/:id/delete - Deletes a community post.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/posts/:id/delete', requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM community_posts WHERE post_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    // console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: 'Error deleting post' });
  }
});

/**
 * POST /admin/users/:id/delete - Deletes a user account.
 * Prevents administrators from deleting their own account.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (parseInt(userId) === req.session.userId) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    // console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Error deleting user' });
  }
});

/**
 * GET /admin/users/:id - Retrieves user details for editing.
 * Returns JSON data for a specific user.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await queryOne(`
      SELECT user_id, username, email, role, is_verified, created_at 
      FROM users WHERE user_id = ?
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    // console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

/**
 * POST /admin/users/:id/role - Updates a user's role (regular/admin).
 * Prevents administrators from changing their own role.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['regular', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    if (parseInt(userId) === req.session.userId) {
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }

    await query('UPDATE users SET role = ? WHERE user_id = ?', [role, userId]);
    res.json({ success: true });
  } catch (error) {
    // console.error('Update role error:', error);
    res.status(500).json({ success: false, error: 'Error updating user role' });
  }
});

module.exports = router;