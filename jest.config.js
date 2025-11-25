module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/tests/legacy/**/*.test.js'  // Add this line
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/tests/helpers/',
    '/tests/runners/',
    '/tests/python/'
  ],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js']
};