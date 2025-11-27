const photoModel = require('../../../models/photoModel');
const { query, queryOne } = require('../../../config/database');

jest.mock('../../../config/database');

describe('Photo Model Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should get public photos with pagination', async () => {
    const mockPhotos = [{ photo_id: 1, title: 'Test Photo', is_public: 1 }];
    query.mockResolvedValue(mockPhotos);
    
    const result = await photoModel.getPublicPhotos(1, 12, {});
    expect(result).toEqual(mockPhotos);
    expect(query).toHaveBeenCalled();
  });

  test('should create new photo', async () => {
    const photoData = {
      user_id: 1,
      pet_id: 1,
      photo_url: 'test.jpg',
      title: 'Test Photo',
      description: 'Test description',
      is_public: true
    };
    
    query.mockResolvedValue({ insertId: 1 });
    
    const result = await photoModel.createPhoto(photoData);
    expect(result).toBe(1);
  });
});