const { exec } = require('child_process');

const testSuites = [
  { name: 'Unit Tests', command: 'npm run test:unit' },
  { name: 'Integration Tests', command: 'npm run test:integration' },
  { name: 'Auth Tests', command: 'npm run test:e2e:node:auth' },
  { name: 'Pet Tests', command: 'npm run test:e2e:node:pets' },
  { name: 'Python Tests', command: 'npm run test:python' }
];

async function runAllTests() {
  console.log('🚀 Running Complete Test Suite\n');
  
  let passed = 0;
  let failed = 0;

  for (const suite of testSuites) {
    console.log(`\n📋 ${suite.name}`);
    console.log('='.repeat(40));
    
    try {
      await runCommand(suite.command);
      console.log(`✅ ${suite.name} - PASSED`);
      passed++;
    } catch (error) {
      console.log(`❌ ${suite.name} - FAILED`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(40));
  console.log(`🎯 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(40));
  
  process.exit(failed > 0 ? 1 : 0);
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(stdout);
      resolve();
    });
  });
}

runAllTests();