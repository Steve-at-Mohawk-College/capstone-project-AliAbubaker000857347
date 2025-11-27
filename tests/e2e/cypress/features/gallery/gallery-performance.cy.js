describe('Gallery Performance Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[name="email"]').type('aliabdulsameea69@gmail.com');
    cy.get('input[name="password"]').type('HawlerErbil6824!');
    cy.get('button[type="submit"]').click();
    cy.visit('http://localhost:3000/gallery');
  });

  it('should load gallery page successfully', () => {
    // Use get instead of contains to avoid the title tag issue
    cy.get('h1').should('contain', 'Community Gallery');
    cy.get('.photo-card').should('exist');
  });
});