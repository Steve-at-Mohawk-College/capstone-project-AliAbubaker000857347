const { query, queryOne } = require('../config/database');

async function createUser(username, email, passwordHash, token) {
  const sql = `
    INSERT INTO users (username, email, password_hash, verification_token) 
    VALUES (?, ?, ?, ?)
  `;
  return query(sql, [username, email, passwordHash, token]);
}

async function findByEmail(email) {
  return queryOne(`SELECT * FROM users WHERE email = ?`, [email]);
}

async function findByUsername(username) {
  return queryOne(`SELECT * FROM users WHERE username = ?`, [username]);
}

async function findById(id) {
  return queryOne(`SELECT * FROM users WHERE user_id = ?`, [id]);
}

async function verifyUser(token) {
  const sql = `UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = ?`;
  return query(sql, [token]);
}

async function updateProfile(userId, { username, email, bio, profile_picture_url }) {
  const sql = `UPDATE users SET username=?, email=?, bio=?, profile_picture_url=? WHERE user_id=?`;
  return query(sql, [username, email, bio, profile_picture_url, userId]);
}

async function updateUserProfilePicture(userId, profilePictureUrl) {
  const sql = 'UPDATE users SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
  return query(sql, [profilePictureUrl, userId]);
}

async function getUserProfile(userId) {
  const sql = 'SELECT user_id, username, email, profile_picture_url, bio, role, created_at, updated_at FROM users WHERE user_id = ?';
  return queryOne(sql, [userId]);
}

async function deleteUser(userId) {
  return query(`DELETE FROM users WHERE user_id=?`, [userId]);
}

// Get user profile with additional stats
async function getUserProfileWithStats(userId) {
  const userSql = 'SELECT user_id, username, email, profile_picture_url, bio, role, created_at FROM users WHERE user_id = ?';
  const petsSql = 'SELECT COUNT(*) as pet_count FROM pets WHERE user_id = ?';
  const tasksSql = 'SELECT COUNT(*) as task_count FROM tasks WHERE user_id = ? AND completed = false AND due_date >= NOW()';
  
  const user = await queryOne(userSql, [userId]);
  const pets = await queryOne(petsSql, [userId]);
  const tasks = await queryOne(tasksSql, [userId]);
  
  return {
    ...user,
    pet_count: pets.pet_count,
    upcoming_task_count: tasks.task_count
  };
}

// Check if username or email already exists (excluding current user)
async function checkUserExistsExcludingCurrent(userId, username, email) {
  const sql = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND user_id != ?';
  return queryOne(sql, [username, email, userId]);
}

module.exports = {
  createUser,
  findByEmail,
  findByUsername,
  findById,
  verifyUser,
  updateProfile,
  updateUserProfilePicture,
  getUserProfile,
  getUserProfileWithStats,
  checkUserExistsExcludingCurrent,
  deleteUser
};