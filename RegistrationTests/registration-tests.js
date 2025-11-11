const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

const testScenarios = [
  // Required field tests
  {
    name: 'Empty form',
    data: { username: '', email: '', password: '' },
    expectedError: 'Email, password, and username are required.'
  },
  {
    name: 'Missing username',
    data: { username: '', email: 'test@test.com', password: 'password123' },
    expectedError: 'Email, password, and username are required.'
  },
  {
    name: 'Missing email',
    data: { username: 'testuser', email: '', password: 'password123' },
    expectedError: 'Email, password, and username are required.'
  },
  {
    name: 'Missing password',
    data: { username: 'testuser', email: 'test@test.com', password: '' },
    expectedError: 'Email, password, and username are required.'
  },

  // Email validation tests
  {
    name: 'Invalid email format',
    data: { username: 'testuser', email: 'invalid-email', password: 'password123' },
    expectedError: 'Please enter a valid email address.'
  },
  {
    name: 'Email without @',
    data: { username: 'testuser', email: 'test.com', password: 'password123' },
    expectedError: 'Please enter a valid email address.'
  },
  {
    name: 'Email without domain',
    data: { username: 'testuser', email: 'test@', password: 'password123' },
    expectedError: 'Please enter a valid email address.'
  },

  // Password validation tests
  {
    name: 'Password too short (7 chars)',
    data: { username: 'testuser', email: 'test@test.com', password: '1234567' },
    expectedError: 'Password must be at least 8 characters long.'
  },
  // ADD THIS SUCCESS TEST CASE BACK:
  {
    name: 'Password minimum (8 chars) - SUCCESS',
    data: { 
      username: `successuser_${Date.now()}`,
      email: `success_${Date.now()}@test.com`, 
      password: '12345678' 
    },
    shouldSucceed: true
  }
];

// Helper function to extract error from HTML
function extractErrorFromHTML(html) {
  const errorMatch = html.match(/<div class="alert alert-danger">([^<]+)<\/div>/);
  return errorMatch ? errorMatch[1].trim() : null;
}

// Helper function to extract success message from HTML
function extractSuccessFromHTML(html) {
  const successMatch = html.match(/<div class="alert alert-info">([^<]+)<\/div>/);
  return successMatch ? successMatch[1].trim() : null;
}

// Helper function to check if response indicates success
function isSuccessResponse(html) {
  const successMessage = extractSuccessFromHTML(html);
  return successMessage && successMessage.includes('Check your email');
}

async function runTests() {
  console.log('🚀 Starting Registration Tests...\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of testScenarios) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/auth/register`, test.data, {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseData = response.data;

      // Check if test should succeed
      if (test.shouldSucceed) {
        if (response.status === 200 && isSuccessResponse(responseData)) {
          const successMessage = extractSuccessFromHTML(responseData);
          console.log(`✅ PASS: ${test.name}`);
          console.log(`   Success message: "${successMessage}"`);
          passed++;
        } else {
          console.log(`❌ FAIL: ${test.name} - Expected success but got status ${response.status}`);
          const errorMessage = extractErrorFromHTML(responseData);
          if (errorMessage) {
            console.log(`   Error: "${errorMessage}"`);
          }
          failed++;
        }
      } else {
        // Test should fail with specific error
        const errorMessage = extractErrorFromHTML(responseData);
        
        if (errorMessage && errorMessage.includes(test.expectedError)) {
          console.log(`✅ PASS: ${test.name}`);
          passed++;
        } else {
          console.log(`❌ FAIL: ${test.name}`);
          console.log(`   Expected: "${test.expectedError}"`);
          console.log(`   Got: "${errorMessage || 'No error message found'}"`);
          console.log(`   Status: ${response.status}`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testScenarios.length} tests`);
  
  // Run duplicate tests separately with unique data
  await runDuplicateTests();
}

// Separate function for duplicate tests with unique data
async function runDuplicateTests() {
  console.log('\n🧪 Running Duplicate Tests...');
  
  const duplicateTests = [
    {
      name: 'Duplicate email',
      data: { username: `uniqueuser_${Date.now()}`, email: 'duplicate@test.com', password: 'password123' },
      expectedError: 'Email already in use.'
    },
    {
      name: 'Duplicate username', 
      data: { username: 'existinguser', email: `unique_${Date.now()}@test.com`, password: 'password123' },
      expectedError: 'Username already taken.'
    }
  ];

  let dupPassed = 0;
  let dupFailed = 0;

  for (const test of duplicateTests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/auth/register`, test.data, {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const errorMessage = extractErrorFromHTML(response.data);
      
      if (errorMessage && errorMessage.includes(test.expectedError)) {
        console.log(`✅ PASS: ${test.name}`);
        dupPassed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Expected: "${test.expectedError}"`);
        console.log(`   Got: "${errorMessage || 'No error message found'}"`);
        dupFailed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      dupFailed++;
    }
  }

  console.log(`📊 Duplicate Tests: ${dupPassed} passed, ${dupFailed} failed`);
}

// Run tests
runTests();