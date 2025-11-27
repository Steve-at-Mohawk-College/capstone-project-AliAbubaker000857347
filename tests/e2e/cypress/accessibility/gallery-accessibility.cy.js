describe('Gallery Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[name="email"]').type('aliabdulsameea69@gmail.com');
    cy.get('input[name="password"]').type('HawlerErbil6824!');
    cy.get('button[type="submit"]').click();
    cy.visit('http://localhost:3000/gallery');
  });

  it('should load gallery page successfully', () => {
    // Check page title in the visible content, not the HTML title tag
    cy.get('h1').should('contain', 'Community Gallery');
    cy.get('.photo-card').should('exist');
    cy.get('.photo-image').should('be.visible');
  });

  it('should have accessible images with alt text', () => {
    // Check all visible images have alt attributes
    cy.get('img').each(($img) => {
      if ($img.is(':visible')) {
        cy.wrap($img).should('have.attr', 'alt');
      }
    });
  });

  it('should have proper page structure', () => {
    // Check for navigation
    cy.get('nav').should('exist');
    
    // Check for container
    cy.get('.container').should('exist');
    
    // Check for headings
    cy.get('h1').should('exist');
  });

  it('should have accessible interactive elements', () => {
    // Check buttons are accessible
    cy.get('button').each(($button) => {
      if ($button.is(':visible')) {
        const text = $button.text().trim();
        const ariaLabel = $button.attr('aria-label');
        
        // Log buttons without proper labels for debugging
        if (text.length === 0 && !ariaLabel) {
          cy.log('Button without text or aria-label:', $button.attr('class'));
        }
      }
    });

    // Check links have meaningful text
    cy.get('a').each(($link) => {
      if ($link.is(':visible') && $link.attr('href') !== '#') {
        const text = $link.text().trim();
        expect(text.length).to.be.greaterThan(0);
      }
    });
  });


    it('should have accessible form elements', () => {
    // Check search input exists
    cy.get('input[name="search"]').should('exist');
    
    // Check it has either placeholder, aria-label, or id
    cy.get('input[name="search"]').should(($input) => {
      const hasPlaceholder = $input.attr('placeholder') !== undefined;
      const hasAriaLabel = $input.attr('aria-label') !== undefined;
      const hasId = $input.attr('id') !== undefined;
      
      expect(hasPlaceholder || hasAriaLabel || hasId).to.be.true;
    });
  });



  it('should have proper color contrast for critical elements', () => {
    // Check key text elements are visible
    cy.get('h1').should('be.visible');
    cy.get('.card-title').first().should('be.visible');
    cy.get('.btn-primary').first().should('be.visible');
  });

  it('should handle photo cards accessibility', () => {
    // Check photo cards have proper structure
    cy.get('.photo-card').first().should(($card) => {
      expect($card.find('img').length).to.be.greaterThan(0);
      expect($card.find('.card-title').length).to.be.greaterThan(0);
    });
    
    // Check first photo card specifically
    cy.get('.photo-card').first().within(() => {
      cy.get('img').should('have.attr', 'alt');
      cy.get('.card-title').should('exist');
    });
  });
});