const { spawn } = require('child_process');

console.log('🧪 Starting Notification System Tests\n');

async function runTests() {
  const tests = [
    { name: 'Model Tests', file: 'notification-model.test.js' },
    { name: 'Service Tests', file: 'notification-service.test.js' },
    { name: 'Routes Tests', file: 'notification-routes.test.js' },
    { name: 'Integration Tests', file: 'notification-integration.test.js' } // Fixed filename
  ];

  let allPassed = true;

  for (const test of tests) {
    console.log(`\n📋 Running ${test.name}`);
    console.log('='.repeat(50));

    try {
      const result = await runJestTest(test.file);
      
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

function runJestTest(testFile) {
  return new Promise((resolve, reject) => {
    const jestProcess = spawn('npx', [
      'jest',
      `tests/${testFile}`,
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      '--testTimeout=30000'
    ], {
      stdio: 'inherit',
      shell: true
    });

    jestProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false });
      }
    });

    jestProcess.on('error', (error) => {
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