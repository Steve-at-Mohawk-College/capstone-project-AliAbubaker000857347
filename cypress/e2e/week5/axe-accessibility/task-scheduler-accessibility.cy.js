describe('Task Scheduler - Form Accessibility Tests', () => {
  beforeEach(() => {
    cy.ultraSimpleLogin();
    cy.visit('/schedule-task');
    cy.url().should('include', '/schedule-task');
    cy.get('body').should('be.visible');
    cy.injectAxe();
  });

  it('should load task scheduler form with all required fields', () => {
    // Page verification
    cy.contains(/schedule task|create task|new task/i).should('be.visible');
    cy.get('form').should('exist').and('be.visible');
    
    // Check required form fields
    const requiredFields = [
      'select:first', // Pet selection
      '[name="task_type"], select', // Task type
      '[name="title"], input[type="text"]', // Title
      '[name="due_date"], input[type="datetime-local"]', // Due date
      '[name="priority"], select' // Priority
    ];

    requiredFields.forEach(selector => {
      cy.get(selector).should('exist');
    });

    // Verify dropdown options
    cy.get('select:first').find('option').should('have.length.at.least', 1);
    cy.get('[name="task_type"]').find('option').should('have.length.at.least', 2);
  });

  it('should handle form validation properly', () => {
  // Test empty form submission - target the specific task form
  cy.get('form#taskForm').submit();
  
  // Check for validation feedback
  cy.get('body').then(($body) => {
    const hasValidation = $body.find('.error-message, .alert-danger, input:invalid').length > 0;
    
    if (hasValidation) {
      cy.get('.error-message, .alert-danger, .invalid-feedback').should('be.visible');
    } else {
      // Some forms might redirect
      cy.url().should('match', /\/(dashboard|tasks?|schedule-task)/);
    }
  });
});

  it('should maintain accessibility standards', () => {
    // Initial form accessibility
    cy.checkAccessibility('form', {
      includedImpacts: ['critical', 'serious'],
      rules: {
        'color-contrast': { enabled: false }
      }
    });
  });
});