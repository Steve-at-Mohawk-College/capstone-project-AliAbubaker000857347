const request = require('supertest');
const app = require('../../../../server');
const { query } = require('../../../../config/database');

describe('Gallery Integration Tests', () => {
  let authCookie;

  beforeAll(async () => {
    // Login and get session cookie - NO SERVER START NEEDED
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'aliabdulsameea69@gmail.com',
        password: 'HawlerErbil6824!'
      });
    
    authCookie = res.headers['set-cookie'];
  });

  test('should access gallery page', async () => {
    const res = await request(app)
      .get('/gallery')
      .set('Cookie', authCookie);
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Community Gallery');
  });

  test('should access my photos page', async () => {
    const res = await request(app)
      .get('/gallery/my-photos')
      .set('Cookie', authCookie);
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('My Photos');
  });

  test('should access upload page', async () => {
    const res = await request(app)
      .get('/gallery/upload')
      .set('Cookie', authCookie);
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Upload Photo');
  });

  test('should access health overview page', async () => {
    const res = await request(app)
      .get('/gallery/health-overview')
      .set('Cookie', authCookie);
    
    expect(res.status).toBe(200);
    expect(res.text).toContain('Health Overview');
  });

  test('should view photo details if photos exist', async () => {
    // Check if there are any photos first
    const photos = await query('SELECT photo_id FROM photos WHERE is_public = 1 LIMIT 1');
    
    if (photos.length > 0) {
      const photoId = photos[0].photo_id;
      const res = await request(app)
        .get(`/gallery/photo/${photoId}`)
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
    } else {
      console.log('No public photos found for testing');
      // This is fine - just skip the assertion
    }
  });

  test('should handle photo search', async () => {
    const res = await request(app)
      .get('/gallery?search=test')
      .set('Cookie', authCookie);
    
    expect(res.status).toBe(200);
  });

  test('should handle tag filtering', async () => {
    const res = await request(app)
      .get('/gallery?tag=cute')
      .set('Cookie', authCookie);
    
    expect(res.status).toBe(200);
  });
});