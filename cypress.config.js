const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      // Register tasks for accessibility logging
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        table(message) {
          console.table(message)
          return null
        }
      })
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
  env: {
    // Test credentials - update these to match your test database
    TEST_EMAIL: 'aliabdulsameea69@gmail.com',
    TEST_PASSWORD: 'Ali6824!',
    TEST_USERNAME: 'Ali'
  },
  // Add retries for flaky tests
  retries: {
    runMode: 1,
    openMode: 0,
  }
})