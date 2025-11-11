const axios = require('axios');
const BASE_URL = 'http://localhost:3000';

async function runEdgeCaseTests() {
  console.log('🧪 Running Edge Case Tests...\n');
  
  const edgeCases = [
    {
      name: 'Email with plus addressing',
      data: { username: `plususer_${Date.now()}`, email: `test+tag${Date.now()}@test.com`, password: 'password123' },
      shouldSucceed: true
    },
    {
      name: 'Email with subdomain',
      data: { username: `subuser_${Date.now()}`, email: `test${Date.now()}@sub.domain.com`, password: 'password123' },
      shouldSucceed: true
    },
    {
      name: 'Email with multiple subdomains',
      data: { username: `multisub_${Date.now()}`, email: `test${Date.now()}@a.b.c.domain.com`, password: 'password123' },
      shouldSucceed: true
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of edgeCases) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/auth/register`, test.data, {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name} - Status: ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`📊 Edge Case Results: ${passed} passed, ${failed} failed`);
}

runEdgeCaseTests();