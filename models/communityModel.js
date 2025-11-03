const { query } = require('../config/database');

async function getPosts() {
  return query(`
    SELECT cp.*, u.username 
    FROM community_posts cp
    JOIN users u ON cp.user_id = u.user_id
    ORDER BY cp.created_at DESC
  `);
}

async function createPost(userId, { title, content }) {
  return query(`INSERT INTO community_posts (user_id, title, content) VALUES (?, ?, ?)`, [userId, title, content]);
}

async function addComment(userId, postId, content) {
  return query(`INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)`, [userId, postId, content]);
}



module.exports = { getPosts, createPost, addComment };
