const axios = require('axios');
const BASE_URL = 'http://localhost:3000';

async function runSecurityTests() {
  console.log('🛡️ Running Security Tests...\n');
  
  const securityTests = [
    {
      name: 'SQL Injection in username',
      data: { username: "test'; DROP TABLE users;--", email: `test${Date.now()}@test.com`, password: 'password123' },
      shouldFail: true
    },
    {
      name: 'SQL Injection in email',
      data: { username: `safeuser_${Date.now()}`, email: "test'; DROP TABLE users;--@test.com", password: 'password123' },
      shouldFail: true
    },
    {
      name: 'XSS attempt in username',
      data: { username: "<script>alert('xss')</script>", email: `test${Date.now()}@test.com`, password: 'password123' },
      shouldFail: true
    },
    {
      name: 'Very long username',
      data: { username: 'a'.repeat(256), email: `test${Date.now()}@test.com`, password: 'password123' },
      shouldFail: true
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of securityTests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/auth/register`, test.data, {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Security tests should generally fail or be rejected
      if (response.status === 400 || response.status === 500) {
        console.log(`✅ PASS: ${test.name} - Correctly rejected`);
        passed++;
      } else {
        console.log(`⚠️ WARNING: ${test.name} - Potentially unsafe input accepted (Status: ${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`📊 Security Results: ${passed} passed, ${failed} failed`);
}

runSecurityTests();