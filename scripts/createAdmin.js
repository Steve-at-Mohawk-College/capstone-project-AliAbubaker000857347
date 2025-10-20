const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createAdminUser() {
  try {
    console.log('Setting up admin user...');
    
    // Generate a secure random username to avoid conflicts
    const adminUsername = 'admin_' + crypto.randomBytes(3).toString('hex');
    const adminEmail = 'admin-petCare-2025@petcare.com';
    
    // Check if admin email already exists
    const existingAdmin = await query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists. Updating role and security settings...');
      
      // Update existing user to admin with enhanced security
      await query(
        `UPDATE users 
         SET role = 'admin', is_verified = TRUE, username = ?
         WHERE email = ?`,
        [adminUsername, adminEmail]
      );
      
      console.log('Admin role updated successfully!');
      console.log('New admin username:', adminUsername);
    } else {
      // Create new admin user with secure password
      const securePassword = crypto.randomBytes(12).toString('hex');
      const passwordHash = await bcrypt.hash(securePassword, 12);
      
      await query(
        `INSERT INTO users (username, email, password_hash, role, is_verified) 
         VALUES (?, ?, ?, ?, ?)`,
        [adminUsername, adminEmail, passwordHash, 'admin', true]
      );
      
      console.log('Admin user created successfully!');
      console.log('Email:', adminEmail);
      console.log('Username:', adminUsername);
      console.log('Password:', securePassword);
      console.log('\n⚠️  IMPORTANT: Save this password securely! It will not be shown again.');
    }
    
    // Add admin security settings
    try {
      await query(
        `INSERT INTO admin_security (admin_email, allowed_ips, login_time_range, max_login_attempts, lockout_minutes)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         allowed_ips = VALUES(allowed_ips),
         login_time_range = VALUES(login_time_range),
         max_login_attempts = VALUES(max_login_attempts),
         lockout_minutes = VALUES(lockout_minutes)`,
        [
          adminEmail,
          '127.0.0.1,::1', // Localhost only for security
          '06:00-22:00',   // 6 AM to 10 PM
          3,               // 3 login attempts
          60               // 60 minute lockout
        ]
      );
      console.log('Admin security settings configured.');
    } catch (securityError) {
      console.log('Note: Admin security table might not exist yet. Run the SQL setup first.');
    }
    
    console.log('\n✅ Admin setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Please run the SQL setup queries first to create the required tables.');
    }
    
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };