const { query } = require('../config/database');

/**
 * Retrieves all community posts with author usernames.
 * Returns posts in reverse chronological order (newest first).
 * 
 * @returns {Promise<Array>} Array of post objects including author usernames
 */
async function getPosts() {
  return query(`
    SELECT cp.*, u.username 
    FROM community_posts cp
    JOIN users u ON cp.user_id = u.user_id
    ORDER BY cp.created_at DESC
  `);
}

/**
 * Creates a new community post in the database.
 * 
 * @param {number} userId - ID of the user creating the post
 * @param {Object} postData - Post content data
 * @param {string} postData.title - Title of the post
 * @param {string} postData.content - Main content/body of the post
 * @returns {Promise<Object>} Database insert result
 */
async function createPost(userId, { title, content }) {
  return query(
    `INSERT INTO community_posts (user_id, title, content) VALUES (?, ?, ?)`,
    [userId, title, content]
  );
}

/**
 * Adds a comment to a community post.
 * 
 * @param {number} userId - ID of the user adding the comment
 * @param {number} postId - ID of the post being commented on
 * @param {string} content - Content of the comment
 * @returns {Promise<Object>} Database insert result
 */
async function addComment(userId, postId, content) {
  return query(
    `INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)`,
    [userId, postId, content]
  );
}

module.exports = { getPosts, createPost, addComment };