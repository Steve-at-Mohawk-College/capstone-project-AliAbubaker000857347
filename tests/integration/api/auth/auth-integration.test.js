// Test data for community testing
module.exports = {
  testUser: {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'testpassword123',
    username: process.env.TEST_USERNAME || 'testuser'
  },
  
  communityTestData: {
    validPost: {
      title: 'Test Post ' + Date.now(),
      content: 'This is a test post content for automated testing.'
    },
    
    xssPayloads: [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")'
    ],
    
    sqlPayloads: [
      "' OR '1'='1",
      "'; DROP TABLE users; --"
    ]
  }
};