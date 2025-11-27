describe('Gallery Page E2E Tests', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('http://localhost:3000/login');
    cy.get('input[name="email"]').type('aliabdulsameea69@gmail.com');
    cy.get('input[name="password"]').type('HawlerErbil6824!');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to gallery and display photos', () => {
    cy.visit('http://localhost:3000/gallery');
    // FIX: Use get instead of contains to avoid title tag issue
    cy.get('h1').should('contain', 'Community Gallery');
    cy.get('.photo-card').should('exist');
    cy.get('.photo-image').should('be.visible');
  });

  it('should access my photos page', () => {
    cy.visit('http://localhost:3000/gallery/my-photos');
    cy.get('h1').should('contain', 'My Photos');
  });

  it('should access upload page and show form', () => {
    cy.visit('http://localhost:3000/gallery/upload');
    cy.get('h1').should('contain', 'Upload Photo');
    cy.get('input[name="title"]').should('exist');
    cy.get('textarea[name="description"]').should('exist');
    cy.get('input[type="file"]').should('exist');
  });

  it('should filter photos by tags', () => {
    cy.visit('http://localhost:3000/gallery');
    
    // Check if there are tags to click
    cy.get('body').then(($body) => {
      if ($body.find('.tag-badge').length > 0) {
        cy.get('.tag-badge').first().click();
        cy.url().should('include', 'tag=');
        cy.get('.photo-card').should('exist');
      }
    });
  });

  it('should search for photos', () => {
    cy.visit('http://localhost:3000/gallery');
    cy.get('input[name="search"]').type('dog{enter}');
    cy.get('.photo-card').should('exist');
  });

  it('should view photo details', () => {
    cy.visit('http://localhost:3000/gallery');
    
    // Click on first photo if available
    cy.get('body').then(($body) => {
      if ($body.find('.photo-card').length > 0) {
        cy.get('.photo-card').first().click();
        cy.url().should('include', '/gallery/photo/');
        cy.get('h2').should('exist'); // Photo title
        cy.get('img').should('be.visible'); // Photo image
      }
    });
  });

  it('should test photo upload form without file upload', () => {
    cy.visit('http://localhost:3000/gallery/upload');
    
    // Fill out the form but skip file upload (since attachFile doesn't exist)
    cy.get('input[name="title"]').type('Test Dog Photo');
    cy.get('textarea[name="description"]').type('White and brown dog playing');
    cy.get('input[name="tags"]').type('cute,dog,pet');
    
    // Just verify the form can be accessed and filled
    cy.get('input[name="title"]').should('have.value', 'Test Dog Photo');
    cy.get('textarea[name="description"]').should('have.value', 'White and brown dog playing');
  });

 it('should upload photo with actual image and display it', () => {
  cy.visit('http://localhost:3000/gallery/upload');
  
  // DEBUG: Check what options are available in the pet select
  cy.get('select[name="pet_id"]').then(($select) => {
    console.log('Select element:', $select);
    console.log('Select HTML:', $select.html());
    
    // Get all options
    const options = $select.find('option');
    console.log('Number of options:', options.length);
    
    options.each((index, option) => {
      console.log(`Option ${index}:`, {
        value: option.value,
        text: option.text,
        selected: option.selected
      });
    });
  });

  // Fill out the form
  cy.get('input[name="title"]').type('Beautiful Dog');
  cy.get('textarea[name="description"]').type('White and brown dog playing in the park');
  cy.get('input[name="tags"]').type('cute,dog,pet,playful');
  
  // Try different approaches for selecting a pet:
  cy.get('select[name="pet_id"]').then(($select) => {
    const options = $select.find('option');
    
    if (options.length > 1) { // Skip the first option if it's "Select a pet"
      // Option 1: Select by index (skip first option if it's placeholder)
      cy.get('select[name="pet_id"]').select(1);
      
      // Option 2: Select by visible text
      // cy.get('select[name="pet_id"]').select(options.eq(1).text());
      
      // Option 3: Select by value if available
      // const firstPetValue = options.eq(1).val();
      // if (firstPetValue) {
      //   cy.get('select[name="pet_id"]').select(firstPetValue);
      // }
    } else {
      // If no pets available, we might need to create one first or skip this step
      console.log('No pets available for selection');
    }
  });
  
  // Upload the actual image file
  cy.get('input[type="file"]').selectFile('C:/users/ali dahche 1/Downloads/OIP.webp', {
    force: true
  });
  
  // Submit the form
  cy.get('button[type="submit"]').click();
  
  // Wait for redirect and verify
  cy.url().should('include', '/gallery/my-photos');
  cy.url().should('include', 'message=Photo%20uploaded%20successfully');
  
  // Continue with the rest of the test...
});
});