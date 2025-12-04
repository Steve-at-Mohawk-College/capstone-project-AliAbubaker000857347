const { query, queryOne } = require('../config/database');

/**
 * Creates a new user account with verification token.
 * 
 * @param {string} username - User's chosen username
 * @param {string} email - User's email address
 * @param {string} passwordHash - Hashed password
 * @param {string} token - Email verification token
 * @returns {Promise<Object>} Database insert result
 */
async function createUser(username, email, passwordHash, token) {
  const sql = `
    INSERT INTO users (username, email, password_hash, verification_token) 
    VALUES (?, ?, ?, ?)
  `;
  return query(sql, [username, email, passwordHash, token]);
}

/**
 * Finds a user by email address.
 * 
 * @param {string} email - Email address to search for
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findByEmail(email) {
  return queryOne(`SELECT * FROM users WHERE email = ?`, [email]);
}

/**
 * Updates a user's username.
 * 
 * @param {number} userId - ID of the user to update
 * @param {string} newUsername - New username
 * @returns {Promise<Object>} Database update result
 */
async function updateUsername(userId, newUsername) {
  const sql = `UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
  return query(sql, [newUsername, userId]);
}

/**
 * Updates a user's bio.
 * 
 * @param {number} userId - ID of the user to update
 * @param {string} bio - New bio content
 * @returns {Promise<Object>} Database update result
 */
async function updateUserBio(userId, bio) {
  const sql = 'UPDATE users SET bio = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
  return query(sql, [bio, userId]);
}

/**
 * Retrieves a user's bio with moderation status.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Object|null>} Object containing bio and moderation status
 */
async function getUserBio(userId) {
  const sql = 'SELECT bio, bio_requires_moderation FROM users WHERE user_id = ?';
  return queryOne(sql, [userId]);
}

/**
 * Updates the moderation status of a user's bio.
 * 
 * @param {number} userId - ID of the user
 * @param {boolean} requiresModeration - Whether the bio requires moderation
 * @returns {Promise<Object>} Database update result
 */
async function updateBioModerationStatus(userId, requiresModeration) {
  const sql = 'UPDATE users SET bio_requires_moderation = ? WHERE user_id = ?';
  return query(sql, [requiresModeration, userId]);
}

/**
 * Finds a user by username.
 * 
 * @param {string} username - Username to search for
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findByUsername(username) {
  return queryOne(`SELECT * FROM users WHERE username = ?`, [username]);
}

/**
 * Finds a user by ID.
 * 
 * @param {number} id - User ID to search for
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findById(id) {
  return queryOne(`SELECT * FROM users WHERE user_id = ?`, [id]);
}

/**
 * Verifies a user's email using verification token.
 * 
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Database update result
 */
async function verifyUser(token) {
  const sql = `UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = ?`;
  return query(sql, [token]);
}

/**
 * Updates a user's profile information.
 * 
 * @param {number} userId - ID of the user to update
 * @param {Object} profileData - Profile fields to update
 * @param {string} profileData.username - New username
 * @param {string} profileData.email - New email
 * @param {string} profileData.bio - New bio
 * @param {string} profileData.profile_picture_url - New profile picture URL
 * @returns {Promise<Object>} Database update result
 */
async function updateProfile(userId, { username, email, bio, profile_picture_url }) {
  const sql = `UPDATE users SET username=?, email=?, bio=?, profile_picture_url=? WHERE user_id=?`;
  return query(sql, [username, email, bio, profile_picture_url, userId]);
}

/**
 * Updates a user's profile picture URL.
 * 
 * @param {number} userId - ID of the user
 * @param {string} profilePictureUrl - Cloudinary URL of new profile picture
 * @returns {Promise<Object>} Database update result
 */
async function updateUserProfilePicture(userId, profilePictureUrl) {
  const sql = 'UPDATE users SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
  const result = await query(sql, [profilePictureUrl, userId]);
  return result;
}

/**
 * Retrieves a user's profile information.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Object|null>} User profile object or null if not found
 */
async function getUserProfile(userId) {
  const sql = 'SELECT user_id, username, email, profile_picture_url, bio, role, created_at, updated_at FROM users WHERE user_id = ?';
  return queryOne(sql, [userId]);
}

/**
 * Deletes a user account.
 * 
 * @param {number} userId - ID of the user to delete
 * @returns {Promise<Object>} Database delete result
 */
async function deleteUser(userId) {
  return query(`DELETE FROM users WHERE user_id=?`, [userId]);
}

/**
 * Retrieves a user's profile with additional statistics.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Object|null>} User profile with pet count and upcoming task count
 */
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

/**
 * Checks if username or email already exists (excluding current user).
 * 
 * @param {number} userId - Current user's ID to exclude from check
 * @param {string} username - Username to check
 * @param {string} email - Email to check
 * @returns {Promise<Object|null>} Existing user object or null if available
 */
async function checkUserExistsExcludingCurrent(userId, username, email) {
  const sql = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND user_id != ?';
  return queryOne(sql, [username, email, userId]);
}

/**
 * Initiates an email change request with verification token.
 * 
 * @param {number} userId - ID of the user
 * @param {string} email - New email address
 * @param {string} verificationToken - Email verification token
 * @returns {Promise<Object>} Database update result
 */
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

/**
 * Verifies and updates a pending email change.
 * 
 * @param {string} token - Pending email verification token
 * @returns {Promise<Object>} Database update result
 */
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

/**
 * Retrieves pending email information for a user.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Object|null>} Pending email and expiry date
 */
async function getPendingEmail(userId) {
  const sql = 'SELECT pending_email, pending_email_expiry FROM users WHERE user_id = ?';
  return queryOne(sql, [userId]);
}

/**
 * Cancels a pending email change request.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Object>} Database update result
 */
async function cancelPendingEmail(userId) {
  const sql = `UPDATE users 
               SET pending_email = NULL,
                   pending_email_token = NULL,
                   pending_email_expiry = NULL
               WHERE user_id = ?`;
  
  return query(sql, [userId]);
}

/**
 * Checks if email already exists (excluding current user).
 * 
 * @param {number} userId - Current user's ID to exclude from check
 * @param {string} email - Email to check
 * @returns {Promise<Object|null>} Existing user object or null if available
 */
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