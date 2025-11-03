// e2e.js - UPDATED SUPPORT FILE (FIXED)

// Import all commands
import './commands';

// Global configuration and error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  console.error('⚠️  Uncaught exception:', err.message);
  
  // Return false to prevent Cypress from failing the test
  // Only ignore certain types of errors
  const ignoredErrors = [
    'ResizeObserver',
    'hydration',
    'Script error',
    'SecurityError'
  ];
  
  if (ignoredErrors.some(error => err.message.includes(error))) {
    return false;
  }
  
  // Allow other errors to fail the test
  return true;
});

// Log test events for debugging
Cypress.on('test:before:run', (test, runnable) => {
  console.log(`🧪 Starting test: ${test.title}`);
});

Cypress.on('test:after:run', (test, runnable) => {
  console.log(`✅ Finished test: ${test.title}`);
});

// Hide fetch/XHR requests from command log for cleaner output
const app = window.top;
if (app && !app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = `
    .command-name-request, 
    .command-name-xhr { 
      display: none; 
    }
    .cy-tooltip {
      display: none !important;
    }
  `;
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Add global before hook to clear state between tests
beforeEach(() => {
  // Log test context
  cy.log(`🔄 Running test: ${Cypress.currentTest.title}`);
});

// Add global after hook for cleanup
afterEach(() => {
  // Take screenshot on failure
  if (Cypress.currentTest.state === 'failed') {
    const testTitle = Cypress.currentTest.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cy.screenshot(`failed-${testTitle}`);
    cy.log(`❌ Test failed - screenshot saved`);
  }
});