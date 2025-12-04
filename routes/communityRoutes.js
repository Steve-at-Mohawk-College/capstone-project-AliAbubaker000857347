const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

/**
 * Middleware to require authentication for community routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
    if (req.session?.userId) return next();
    return res.redirect('/login');
}

/**
 * GET /community - Renders the main community page with posts and user profiles.
 * Shows community posts with comments and lists regular users (excludes admins).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/', requireAuth, async (req, res) => {
    try {
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

        const posts = Array.from(postsMap.values());

        const communityUsers = await query(`
            SELECT 
                u.user_id,
                u.username,
                u.profile_picture_url,
                u.bio,
                u.bio_requires_moderation,
                u.created_at,
                u.role,
                COUNT(p.pet_id) as pet_count
            FROM users u
            LEFT JOIN pets p ON u.user_id = p.user_id
            WHERE u.is_verified = true 
            AND u.role = 'regular'
            GROUP BY u.user_id, u.username, u.profile_picture_url, u.bio, u.bio_requires_moderation, u.created_at, u.role
            ORDER BY u.created_at DESC
            LIMIT 20
        `);

        res.render('community', {
            title: 'Community - Pet Care',
            username: req.session.username,
            profilePicture: req.session.profilePicture,
            posts: posts,
            communityUsers: communityUsers,
            calculatePetCareDuration: (createdAt) => {
                const joinDate = new Date(createdAt);
                const now = new Date();
                const diffTime = Math.abs(now - joinDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 30) {
                    return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
                } else if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    return `${months} month${months === 1 ? '' : 's'}`;
                } else {
                    const years = Math.floor(diffDays / 365);
                    const remainingMonths = Math.floor((diffDays % 365) / 30);
                    if (remainingMonths > 0) {
                        return `${years} year${years === 1 ? '' : 's'}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
                    }
                    return `${years} year${years === 1 ? '' : 's'}`;
                }
            },
            error: null,
            message: null
        });

    } catch (error) {
        // console.error('Community page error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading community page.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * GET /community/profile/:userId - Renders a user's public profile page.
 * Shows user stats, recent posts, and pet information. Excludes admin profiles.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/profile/:userId', requireAuth, async (req, res) => {
    try {
        const userId = req.params.userId;

        const userProfile = await query(`
            SELECT 
                u.user_id,
                u.username,
                u.profile_picture_url,
                u.bio,
                u.bio_requires_moderation,
                u.created_at,
                u.role,
                COUNT(p.pet_id) as pet_count,
                AVG(p.age) as avg_pet_age,
                GROUP_CONCAT(DISTINCT p.species) as pet_species
            FROM users u
            LEFT JOIN pets p ON u.user_id = p.user_id
            WHERE u.user_id = ? 
            AND u.is_verified = true
            AND u.role = 'regular'
            GROUP BY u.user_id, u.username, u.profile_picture_url, u.bio, u.bio_requires_moderation, u.created_at, u.role
        `, [userId]);

        if (userProfile.length === 0) {
            return res.status(404).render('error', {
                title: 'User Not Found',
                message: 'The requested user profile was not found or is not accessible.',
                error: {}
            });
        }

        const profile = userProfile[0];

        const userPosts = await query(`
            SELECT cp.*, COUNT(c.comment_id) as comment_count
            FROM community_posts cp
            LEFT JOIN comments c ON cp.post_id = c.post_id
            WHERE cp.user_id = ? AND cp.is_approved = true
            GROUP BY cp.post_id
            ORDER BY cp.created_at DESC
            LIMIT 5
        `, [userId]);

        const joinDate = new Date(profile.created_at);
        const now = new Date();
        const diffTime = Math.abs(now - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let petCareDuration;
        if (diffDays < 30) {
            petCareDuration = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            petCareDuration = `${months} month${months === 1 ? '' : 's'}`;
        } else {
            const years = Math.floor(diffDays / 365);
            const remainingMonths = Math.floor((diffDays % 365) / 30);
            if (remainingMonths > 0) {
                petCareDuration = `${years} year${years === 1 ? '' : 's'}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
            } else {
                petCareDuration = `${years} year${years === 1 ? '' : 's'}`;
            }
        }

        res.render('user-profile', {
            title: `${profile.username}'s Profile - Pet Care`,
            username: req.session.username,
            profilePicture: req.session.profilePicture,
            userProfile: profile,
            userPosts: userPosts,
            petCareDuration: petCareDuration,
            isOwnProfile: parseInt(userId) === req.session.userId
        });

    } catch (error) {
        // console.error('User profile error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading user profile.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * POST /community - Creates a new community post.
 * Validates input and inserts post into database with auto-approval.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.session.userId;

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
            [userId, title, content, true]
        );

        res.redirect('/community');
    } catch (error) {
        // console.error('Create post error:', error);
        res.status(500).render('community', {
            title: 'Community - Pet Care',
            error: 'Error creating post',
            posts: [],
            username: req.session.username,
            profilePicture: req.session.profilePicture
        });
    }
});

/**
 * POST /community/comments/:postId - Adds a comment to a community post.
 * Validates input, checks post existence, and inserts comment.
 * Returns new comment data as JSON response.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/comments/:postId', requireAuth, async (req, res) => {
    try {
        const { content } = req.body;
        const { postId } = req.params;
        const userId = req.session.userId;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        if (!postId || isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const post = await query(
            'SELECT * FROM community_posts WHERE post_id = ? AND (is_approved = true OR user_id = ?)',
            [postId, userId]
        );

        if (post.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const result = await query(
            'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
            [userId, postId, content]
        );

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
        // console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            error: 'Error posting comment'
        });
    }
});

/**
 * GET /community/posts - API endpoint to retrieve community posts.
 * Returns JSON data of all approved posts.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
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
        // console.error('Get posts API error:', error);
        res.status(500).json({ success: false, error: 'Error fetching posts' });
    }
});

/**
 * GET /community/comments/:postId - API endpoint to retrieve comments for a specific post.
 * Returns JSON data of comments for the specified post ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
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
        // console.error('Get comments API error:', error);
        res.status(500).json({ success: false, error: 'Error fetching comments' });
    }
});

module.exports = router;