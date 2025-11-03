const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Week 5 E2E and Accessibility Tests...');

// Run all tests together
const cypressCommand = 'npx cypress run --spec "cypress/e2e/week5/**/*.cy.js"';

exec(cypressCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Test execution failed: ${error}`);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    process.exit(1);
  }
  
  console.log('✅ All Week 5 Tests completed successfully!');
  console.log(stdout);
  process.exit(0);
});