// reset-admin.js
const { query } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  try {
    const password = 'SecureAdminPassword123!';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if admin exists
    const [admin] = await query('SELECT * FROM users WHERE email = ?', ['supersecure-472x@petwell.com']);
    
    if (admin) {
      // Update existing admin
      await query(
        'UPDATE users SET password_hash = ?, role = "admin", is_verified = TRUE WHERE email = ?',
        [hashedPassword, 'supersecure-472x@petwell.com']
      );
      console.log('✅ Admin password updated successfully!');
    } else {
      // Create new admin
      await query(
        'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'supersecure-472x@petwell.com', hashedPassword, 'admin', true]
      );
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('Email: supersecure-472x@petwell.com');
    console.log('Password: SecureAdminPassword123!');
    console.log('Login at: /admin/login');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

resetAdmin();