const express = require('express');
const { query, queryOne } = require('../config/database');
const router = express.Router();

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin') return next();
  return res.status(403).render('error', {
    title: 'Access Denied',
    message: 'Admin privileges required to access this page.'
  });
}

// Modify your admin routes to pass additional data
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Get stats for admin dashboard
    const [userCount, petCount, taskCount, postCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM pets'),
      query('SELECT COUNT(*) as count FROM tasks'),
      query('SELECT COUNT(*) as count FROM community_posts')
    ]);

    // Get recent users
    const recentUsers = await query(`
      SELECT user_id, username, email, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Get pending posts for approval
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
      // Pass these for the admin header
      profilePicture: req.session.profilePicture,
      username: req.session.username
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading admin dashboard.'
    });
  }
});

// User management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT user_id, username, email, role, is_verified, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.render('admin/users', {
      title: 'User Management',
      users
    });
  } catch (error) {
    console.error('User management error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading user management.'
    });
  }
});

// Post moderation
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
    console.error('Post moderation error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading post moderation.'
    });
  }
});

// Update your approve post route
router.post('/posts/:id/approve', requireAdmin, async (req, res) => {
  try {
    console.log('Approving post ID:', req.params.id);
    const result = await query('UPDATE community_posts SET is_approved = TRUE WHERE post_id = ?', [req.params.id]);
    console.log('Update result:', result);
    res.json({ success: true });
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ success: false, error: 'Error approving post' });
  }
});

// Update your delete post route
router.post('/posts/:id/delete', requireAdmin, async (req, res) => {
  try {
    console.log('Deleting post ID:', req.params.id);
    const result = await query('DELETE FROM community_posts WHERE post_id = ?', [req.params.id]);
    console.log('Delete result:', result);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: 'Error deleting post' });
  }
});

// Update your role update route
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    console.log('Updating role for user ID:', req.params.id, 'to:', req.body.role);
    const result = await query('UPDATE users SET role = ? WHERE user_id = ?', [req.body.role, req.params.id]);
    console.log('Role update result:', result);
    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: 'Error updating user role' });
  }
});

// Update your delete user route
router.post('/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('Deleting user ID:', userId);
    
    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.session.userId) {
      console.log('Prevented self-deletion attempt');
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    
    const result = await query('DELETE FROM users WHERE user_id = ?', [userId]);
    console.log('User delete result:', result);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Error deleting user' });
  }
});

// Get user details for editing
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
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// Update user role (already exists, but add better error handling)
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    // Validate role
    if (!['regular', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    
    // Prevent admin from changing their own role
    if (parseInt(userId) === req.session.userId) {
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }
    
    await query('UPDATE users SET role = ? WHERE user_id = ?', [role, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: 'Error updating user role' });
  }
});

module.exports = router;