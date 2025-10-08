// tests/start-server-and-test.js
const { spawn } = require('child_process');
const { exec } = require('child_process');

console.log(' Starting server for integration tests...');

// Start the server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait for server to be ready
setTimeout(() => {
  console.log(' Pass: Server should be ready, running tests...');
  
  // Run the tests
  const tests = spawn('npm', ['run', 'test:tasks:integration'], {
    stdio: 'inherit',
    shell: true
  });
  
  tests.on('close', (code) => {
    console.log(`🏁 Tests completed with code: ${code}`);
    server.kill();
    process.exit(code);
  });
}, 5000); // Wait 5 seconds for server to start