// routes/communityRoutes.js
const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

// GET /community - Community page
router.get('/', requireAuth, async (req, res) => {
    console.log('GET /community - Loading community page');
    
    try {
        // CORRECTED QUERY: Remove JavaScript comments from SQL
        const postsWithComments = await query(`
            SELECT 
                cp.*, 
                u.username as post_username,
                u.profile_picture_url as post_profile_picture,
                c.comment_id,
                c.content as comment_content,
                c.created_at as comment_created_at,
                cu.username as comment_username,
                cu.profile_picture_url as comment_profile_picture
            FROM community_posts cp
            JOIN users u ON cp.user_id = u.user_id
            LEFT JOIN comments c ON cp.post_id = c.post_id
            LEFT JOIN users cu ON c.user_id = cu.user_id
            WHERE cp.is_approved = true OR cp.user_id = ?
            ORDER BY cp.created_at DESC, c.created_at ASC
        `, [req.session.userId]);

        // Group comments by post
        const postsMap = new Map();
        
        postsWithComments.forEach(row => {
            if (!postsMap.has(row.post_id)) {
                postsMap.set(row.post_id, {
                    post_id: row.post_id,
                    title: row.title,
                    content: row.content,
                    created_at: row.created_at,
                    username: row.post_username,
                    profile_picture_url: row.post_profile_picture,
                    comments: []
                });
            }
            
            if (row.comment_id) {
                postsMap.get(row.post_id).comments.push({
                    comment_id: row.comment_id,
                    content: row.comment_content,
                    created_at: row.comment_created_at,
                    username: row.comment_username,
                    profile_picture_url: row.comment_profile_picture
                });
            }
        });

        // Convert map to array for rendering
        const posts = Array.from(postsMap.values());

        console.log(`✅ Loaded ${posts.length} community posts`);

        res.render('community', {
            title: 'Community - Pet Care',
            username: req.session.username,
            profilePicture: req.session.profilePicture,
            posts: posts,
            error: null,
            message: null
        });

    } catch (error) {
        console.error('Community page error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading community page.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// POST /community - Create a new post
router.post('/', requireAuth, async (req, res) => {
    console.log('POST /community - Creating new post');
    
    try {
        const { title, content } = req.body;
        const userId = req.session.userId;

        console.log('New post data:', { title, content, userId });

        if (!title || !content) {
            return res.status(400).render('community', {
                title: 'Community - Pet Care',
                error: 'Title and content are required',
                posts: [],
                username: req.session.username,
                profilePicture: req.session.profilePicture
            });
        }

        await query(
            'INSERT INTO community_posts (user_id, title, content, is_approved) VALUES (?, ?, ?, ?)',
            [userId, title, content, true] // Auto-approve for now
        );

        console.log('Post created successfully');
        res.redirect('/community');
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).render('community', {
            title: 'Community - Pet Care',
            error: 'Error creating post',
            posts: [],
            username: req.session.username,
            profilePicture: req.session.profilePicture
        });
    }
});

// POST /community/comments/:postId - Add comment to a post
router.post('/comments/:postId', requireAuth, async (req, res) => {
    console.log('POST /community/comments/:postId - Adding comment');
    
    try {
        const { content } = req.body;
        const { postId } = req.params;
        const userId = req.session.userId;

        console.log('Comment data:', { content, postId, userId });

        // Validation
        if (!content) {
            console.log('No content provided');
            return res.status(400).json({ 
                success: false, 
                error: 'Content is required' 
            });
        }

        if (!postId || isNaN(postId)) {
            console.log('Invalid post ID:', postId);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid post ID' 
            });
        }

        // Check if post exists
        const post = await query(
            'SELECT * FROM community_posts WHERE post_id = ? AND (is_approved = true OR user_id = ?)',
            [postId, userId]
        );

        if (post.length === 0) {
            console.log('Post not found or not approved:', postId);
            return res.status(404).json({ 
                success: false, 
                error: 'Post not found' 
            });
        }

        // Insert comment
        const result = await query(
            'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
            [userId, postId, content]
        );

        console.log('Comment inserted successfully:', result.insertId);

        // Get the new comment with username AND profile_picture_url
        const newComment = await query(`
            SELECT c.*, u.username, u.profile_picture_url 
            FROM comments c 
            JOIN users u ON c.user_id = u.user_id 
            WHERE c.comment_id = ?
        `, [result.insertId]);

        res.json({ 
            success: true, 
            comment: newComment[0] 
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error posting comment' 
        });
    }
});

// GET /community/posts - API endpoint to get posts
router.get('/posts', requireAuth, async (req, res) => {
    try {
        const posts = await query(`
            SELECT cp.*, u.username, u.profile_picture_url 
            FROM community_posts cp
            JOIN users u ON cp.user_id = u.user_id
            WHERE cp.is_approved = true
            ORDER BY cp.created_at DESC
        `);
        
        res.json({ success: true, posts });
    } catch (error) {
        console.error('Get posts API error:', error);
        res.status(500).json({ success: false, error: 'Error fetching posts' });
    }
});

// GET /community/comments/:postId - API endpoint to get comments for a post
router.get('/comments/:postId', requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        
        const comments = await query(`
            SELECT c.*, u.username, u.profile_picture_url 
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);
        
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments API error:', error);
        res.status(500).json({ success: false, error: 'Error fetching comments' });
    }
});

module.exports = router;