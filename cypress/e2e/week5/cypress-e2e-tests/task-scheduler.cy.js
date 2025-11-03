describe('Task Scheduler E2E Tests', () => {
  beforeEach(() => {
    cy.ultraSimpleLogin();
    cy.visit('/schedule-task');
    cy.url().should('include', '/schedule-task');
    cy.get('body').should('be.visible');
  });

  it('should load the schedule task page successfully', () => {
    cy.url().should('include', '/schedule-task');
    cy.contains(/schedule task|create task|new task/i).should('be.visible');
    
    // Target the specific task form, not all forms
    cy.get('form#taskForm').should('exist').and('be.visible');
    
    // More specific error checking - look for error messages/alerts
    cy.get('body').then(($body) => {
      // Check for error alerts or messages
      const hasErrorAlert = $body.find('.alert-danger, .error-message, [class*="error"]').length > 0;
      const hasGenericError = $body.text().includes('Error:') || $body.text().includes('error:');
      
      if (hasErrorAlert || hasGenericError) {
        cy.log('❌ Error detected on page');
        throw new Error('Page contains error messages');
      }
    });
  });

  it('should display all required form fields', () => {
    // More specific selectors targeting the task form
    const requiredFields = [
      '#pet_id',
      '#task_type', 
      '#title',
      '#due_date',
      '#priority'
    ];

    requiredFields.forEach(field => {
      cy.get(field).should('exist');
    });

    // Verify dropdowns have options (within the task form context)
    cy.get('#pet_id').find('option').should('have.length.at.least', 1);
    cy.get('#task_type').find('option').should('have.length.at.least', 2);
  });

  it('should schedule a new task successfully when pets are available', () => {
    cy.get('#pet_id').then(($select) => {
      const optionCount = $select.find('option').length;
      
      if (optionCount > 1) {
        // Select a pet (skip the first option if it's placeholder)
        const petIndex = optionCount > 2 ? 1 : 0;
        cy.get('#pet_id').select(petIndex);
        
        // Fill task details - use specific IDs only
        cy.get('#task_type').select('feeding');
        cy.get('#title').type('Test Task - Automated by Cypress');
        cy.get('#description').type('This task was created automatically for testing');
        
        // Set due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateString = tomorrow.toISOString().slice(0, 16);
        cy.get('#due_date').type(dateString);
        
        cy.get('#priority').select('medium');
        
        // Submit the specific task form
        cy.get('form#taskForm').submit();
        
        // Check for success (redirect or success message)
        cy.url().should('match', /\/(dashboard|tasks?|schedule-task)/);
        cy.get('body').then(($body) => {
          if ($body.find('.alert-success, .success-message, [class*="success"]').length > 0) {
            cy.contains(/success|created|scheduled/i).should('be.visible');
          }
        });
      } else {
        cy.log('No pets available for task scheduling test');
        // Test form validation instead
        cy.get('form#taskForm').submit();
        cy.get('.error-message, .alert-danger, input:invalid').should('exist');
      }
    });
  });

  it('should validate required fields properly', () => {
  // Try to submit empty form - target specific task form
  cy.get('form#taskForm').submit();
  
  // Wait a bit for any client-side validation to run
  cy.wait(1000);
  
  // Should show validation errors - check multiple possible validation indicators
  cy.get('body').then(($body) => {
    // Check for server-side validation errors (alert messages)
    const hasServerErrors = $body.find('.alert-danger').length > 0;
    
    // Check for client-side validation (invalid fields with Bootstrap classes)
    const hasClientErrors = $body.find('.is-invalid, input:invalid, select:invalid').length > 0;
    
    // Check for HTML5 validation messages
    const hasValidationMessages = $body.find(':invalid').length > 0;
    
    // Check for any error text on the page
    const hasErrorText = $body.text().includes('required') || 
                         $body.text().includes('Invalid') || 
                         $body.text().includes('error');

    cy.log(`Validation check - Server: ${hasServerErrors}, Client: ${hasClientErrors}, HTML5: ${hasValidationMessages}, Text: ${hasErrorText}`);

    if (hasServerErrors) {
      cy.get('.alert-danger').should('be.visible');
    } else if (hasClientErrors) {
      // Check for Bootstrap validation styling
      cy.get('.is-invalid').should('have.length.at.least', 1);
    } else if (hasValidationMessages) {
      // HTML5 validation
      cy.get('input:invalid, select:invalid').should('have.length.at.least', 1);
    } else if (hasErrorText) {
      // Generic error text
      cy.contains(/error|required|invalid/i).should('be.visible');
    } else {
      // If no validation errors are showing, the form might have submitted successfully
      // which means validation isn't working as expected - this should fail the test
      cy.log('❌ No validation errors detected - form may have submitted without validation');
      cy.get('.is-invalid, .alert-danger, input:invalid').should('exist');
    }
  });
});

  it('should handle form cancellation correctly', () => {
    // Look for cancel button in multiple locations
    cy.get('body').then(($body) => {
      // Check for cancel button in the form
      const cancelInForm = $body.find('form#taskForm button').filter((index, element) => {
        return /cancel/i.test(element.textContent || '');
      });
      
      // Check for cancel link
      const cancelLink = $body.find('a').filter((index, element) => {
        return /cancel/i.test(element.textContent || '');
      });
      
      // Check for back to dashboard link (common cancellation pattern)
      const backLink = $body.find('a[href="/dashboard"]');
      
      if (cancelInForm.length > 0) {
        cy.wrap(cancelInForm).first().click();
        cy.url().should('match', /\/(dashboard|tasks?)/);
      } else if (cancelLink.length > 0) {
        cy.wrap(cancelLink).first().click();
        cy.url().should('match', /\/(dashboard|tasks?)/);
      } else if (backLink.length > 0) {
        // If no cancel button, test the back link
        cy.wrap(backLink).first().click();
        cy.url().should('include', '/dashboard');
      } else {
        cy.log('No cancel button or back link found, testing navigation');
        cy.go('back');
        cy.url().should('match', /\/(dashboard|tasks?)/);
      }
    });
  });
});