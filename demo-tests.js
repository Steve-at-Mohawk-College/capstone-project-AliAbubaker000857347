const { exec } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Automated Test Demo...\n');

// Run backend tests
console.log('📋 Running Backend API Tests...');
exec('npm run test:backend', (error, stdout, stderr) => {
  if (error) {
    console.log('Backend Tests Failed:', error);
    return;
  }
  
  console.log('✅ Backend Tests Completed Successfully!');
  console.log(stdout);
  
  // Run frontend tests
  console.log('🎨 Running Frontend Tests...');
  exec('npm run test:frontend', (error, stdout, stderr) => {
    if (error) {
      console.log('Frontend Tests Failed:', error);
      return;
    }
    
    console.log('✅ Frontend Tests Completed Successfully!');
    console.log(stdout);
    
    // Generate test coverage report
    console.log('📊 Generating Test Coverage Report...');
    exec('npm run test:coverage', (error, stdout, stderr) => {
      console.log('📈 Test Coverage Report Generated!');
      console.log('Check coverage/index.html for detailed report');
    });
  });
});