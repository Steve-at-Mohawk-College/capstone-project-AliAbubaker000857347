const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Week 5 E2E Tests...');

// Run Cypress tests
const cypressCommand = 'npx cypress run --spec "cypress/e2e/week5/cypress-e2e-tests/**/*"';

exec(cypressCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Test execution failed: ${error}`);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    process.exit(1);
  }
  
  console.log('✅ Week 5 E2E Tests completed successfully!');
  console.log(stdout);
});