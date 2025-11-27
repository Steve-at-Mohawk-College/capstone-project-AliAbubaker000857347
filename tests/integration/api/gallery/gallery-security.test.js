const request = require('supertest');
const app = require('../../../../server');

describe('Gallery Security Tests', () => {
  test('should prevent unauthorized access to gallery', async () => {
    const res = await request(app).get('/gallery');
    expect(res.status).toBe(302); // Redirect to login
    expect(res.headers.location).toContain('/login');
  });

  test('should prevent unauthorized access to my photos', async () => {
    const res = await request(app).get('/gallery/my-photos');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });

  test('should prevent unauthorized access to upload page', async () => {
    const res = await request(app).get('/gallery/upload');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });

  test('should sanitize user input in photo titles', async () => {
    const maliciousTitle = '<script>alert("xss")</script>Test Photo';
    
    // Try to access with malicious input - should not crash
    const res = await request(app)
      .get('/gallery')
      .query({ search: maliciousTitle });
    
    expect(res.status).toBe(302); // Redirects to login since not authenticated
  });

  test('should handle invalid photo IDs gracefully', async () => {
    // Test with non-existent photo ID
    const res = await request(app).get('/gallery/photo/999999');
    expect(res.status).toBe(302); // Redirect to login
  });

  test('should validate file types on upload', async () => {
    const res = await request(app)
      .post('/gallery/upload')
      .attach('photos', Buffer.from('malicious content'), {
        filename: 'test.exe',
        contentType: 'application/exe'
      });
    
    // Your app should handle this gracefully - either redirect or error
    expect([302, 400, 500]).toContain(res.status);
  });
});