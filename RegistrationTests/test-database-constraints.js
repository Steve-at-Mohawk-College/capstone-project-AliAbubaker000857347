// test-database-constraints.js
const { query, queryOne } = require('../config/database');

async function testDatabaseConstraints() {
  console.log('🧪 Testing Database Constraints...\n');

  const tests = [
    {
      name: 'Unique email constraint',
      sql: `INSERT INTO users (username, email, password_hash, verification_token) 
            VALUES (?, ?, ?, ?)`,
      params: ['user1', 'same@email.com', 'hash1', 'token1']
    },
    {
      name: 'Unique username constraint', 
      sql: `INSERT INTO users (username, email, password_hash, verification_token) 
            VALUES (?, ?, ?, ?)`,
      params: ['sameuser', 'email1@test.com', 'hash1', 'token1']
    },
    {
      name: 'Duplicate both email and username',
      sql: `INSERT INTO users (username, email, password_hash, verification_token) 
            VALUES (?, ?, ?, ?)`,
      params: ['existinguser', 'existing@email.com', 'hash1', 'token1']
    }
  ];

  // First, create a test user
  await query(
    `INSERT INTO users (username, email, password_hash, verification_token, is_verified) 
     VALUES (?, ?, ?, ?, ?)`,
    ['existinguser', 'existing@email.com', 'testhash', 'testtoken', true]
  );

  for (const test of tests) {
    try {
      await query(test.sql, test.params);
      console.log(`❌ FAIL: ${test.name} - Should have failed but succeeded`);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`✅ PASS: ${test.name} - Correctly rejected duplicate`);
      } else {
        console.log(`❌ FAIL: ${test.name} - Unexpected error: ${error.message}`);
      }
    }
  }

  // Cleanup
  await query(`DELETE FROM users WHERE email IN ('same@email.com', 'email1@test.com')`);
}