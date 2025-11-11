// run-all-tests.js
const { exec } = require('child_process');

async function runAllTests() {
  console.log('🧪 Running Comprehensive Registration Tests...\n');
  
  const testFiles = [
    'registration-tests.js',
    'test-database-constraints.js', 
    'test-edge-cases.js',
    'test-security.js'
  ];

  for (const file of testFiles) {
    console.log(`\n📋 Running ${file}...`);
    
    await new Promise((resolve) => {
      exec(`node ${file}`, (error, stdout, stderr) => {
        console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      });
    });
  }
}

runAllTests();