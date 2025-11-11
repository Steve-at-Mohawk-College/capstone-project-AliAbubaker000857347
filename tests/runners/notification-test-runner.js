const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Starting Notification System Tests\n');

async function runTests() {
  const tests = [
    { name: 'Model Tests', command: 'npm run test:notifications:model' },
    { name: 'Service Tests', command: 'npm run test:notifications:service' },
    { name: 'Routes Tests', command: 'npm run test:notifications:routes' },
    { name: 'Integration Tests', command: 'npm run test:notifications:integration' }
  ];

  let allPassed = true;

  for (const test of tests) {
    console.log(`\n📋 Running ${test.name}`);
    console.log('='.repeat(50));

    try {
      const result = await runNpmCommand(test.command);
      
      if (result.success) {
        console.log(`✅ ${test.name} - PASSED\n`);
      } else {
        console.log(`❌ ${test.name} - FAILED\n`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`💥 ${test.name} - ERROR: ${error.message}\n`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(allPassed ? '🎉 ALL NOTIFICATION TESTS PASSED!' : '❌ SOME TESTS FAILED');
  console.log('='.repeat(50));

  return allPassed;
}

function runNpmCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    
    const npmProcess = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true
    });

    npmProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false });
      }
    });

    npmProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Run if called directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runTests;