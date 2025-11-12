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

async function updateUsername(userId, newUsername) {
  const sql = `UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
  return query(sql, [newUsername, userId]);
}




// Update user bio
async function updateUserBio(userId, bio) {
  const sql = 'UPDATE users SET bio = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
  return query(sql, [bio, userId]);
}

// Get user bio with moderation status
async function getUserBio(userId) {
  const sql = 'SELECT bio, bio_requires_moderation FROM users WHERE user_id = ?';
  return queryOne(sql, [userId]);
}

// Update bio moderation status
async function updateBioModerationStatus(userId, requiresModeration) {
  const sql = 'UPDATE users SET bio_requires_moderation = ? WHERE user_id = ?';
  return query(sql, [requiresModeration, userId]);
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
  const userSql = 'SELECT user_id, username, email, profile_picture_url, bio, role, is_verified, created_at FROM users WHERE user_id = ?';
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


// In models/userModel.js - UPDATE updateUserEmail function
async function updateUserEmail(userId, email, verificationToken) {
  const sql = `UPDATE users 
               SET pending_email = ?, 
                   pending_email_token = ?, 
                   pending_email_expiry = ?,
                   updated_at = CURRENT_TIMESTAMP 
               WHERE user_id = ?`;
  
  const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return query(sql, [email, verificationToken, expiryDate, userId]);
}


// Add retry mechanism for critical operations
async function queryWithRetry(sql, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query(sql, params);
    } catch (error) {
      if (error.code === 'ER_USER_LIMIT_REACHED' && attempt < maxRetries) {
        console.log(`Database connection limit reached, retrying... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
}

// Verify pending email
async function verifyPendingEmail(token) {
  const sql = `UPDATE users 
               SET email = pending_email,
                   is_verified = true,
                   pending_email = NULL,
                   pending_email_token = NULL,
                   pending_email_expiry = NULL,
                   verification_token = NULL
               WHERE pending_email_token = ? 
               AND pending_email_expiry > NOW()`;
  
  return query(sql, [token]);
}

// Get pending email info
async function getPendingEmail(userId) {
  const sql = 'SELECT pending_email, pending_email_expiry FROM users WHERE user_id = ?';
  return queryOne(sql, [userId]);
}

// Cancel pending email change
async function cancelPendingEmail(userId) {
  const sql = `UPDATE users 
               SET pending_email = NULL,
                   pending_email_token = NULL,
                   pending_email_expiry = NULL
               WHERE user_id = ?`;
  
  return query(sql, [userId]);
}

// Check if email already exists (excluding current user)
async function checkEmailExistsExcludingCurrent(userId, email) {
  const sql = 'SELECT * FROM users WHERE email = ? AND user_id != ?';
  return queryOne(sql, [email, userId]);
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
  deleteUser,
   updateUsername,
    updateUserBio,
  getUserBio,
  updateBioModerationStatus,
   updateUserEmail, 
  checkEmailExistsExcludingCurrent,
  verifyPendingEmail,      
  getPendingEmail,         
  cancelPendingEmail 
};