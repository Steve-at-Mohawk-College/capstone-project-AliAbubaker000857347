const { defineConfig } = require("cypress");
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      return config;
    },
    specPattern: 'tests/e2e/cypress/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js', // This should now work
    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    viewportWidth: 1280,
    viewportHeight: 720,
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
  },
});