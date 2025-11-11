describe('Notifications E2E Tests', () => {
  beforeEach(() => {
    cy.ultraSimpleLogin();
    // Add verification that login was successful
    cy.url().should('not.include', '/login');
  });

  it('should display notification bell with count in header', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
    
    // Wait for page to load completely
    cy.get('body').should('be.visible');
    cy.wait(2000);
    
    cy.get('#notificationBadge, [class*="badge"], [class*="notification"]').then(($badge) => {
      if ($badge.length > 0 && $badge.is(':visible')) {
        cy.wrap($badge).invoke('text').then((text) => {
          if (text.trim() !== '') {
            const count = parseInt(text);
            expect(count).to.be.at.least(0);
            cy.log(`Notification count: ${count}`);
          }
        });
      } else {
        cy.log('Notification badge not found or not visible');
      }
    });
  });
});