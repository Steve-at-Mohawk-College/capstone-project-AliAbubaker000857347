const NotificationModel = require('../../../models/notificationModel');
const { query } = require('../../../config/database');

// Mock the database
jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

describe('Notification Model', () => {
  let mockUserId;
  let mockNotificationId;

  beforeEach(() => {
    mockUserId = 1;
    mockNotificationId = 123;
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    test('should create a notification successfully', async () => {
      const mockResult = { insertId: 1 };
      query.mockResolvedValue(mockResult);

      const result = await NotificationModel.createNotification(
        mockUserId,
        'task_due',
        'Test Title',
        'Test Message',
        456
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [mockUserId, 'task_due', 'Test Title', 'Test Message', 456, false]
      );
      expect(result).toEqual(mockResult);
    });

    test('should handle database errors', async () => {
      const mockError = new Error('Database error');
      query.mockRejectedValue(mockError);

      await expect(
        NotificationModel.createNotification(mockUserId, 'task_due', 'Title', 'Message')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getNotificationsByUser', () => {
    test('should get notifications with default limit', async () => {
      const mockNotifications = [{ id: 1 }, { id: 2 }];
      query.mockResolvedValue(mockNotifications);

      const result = await NotificationModel.getNotificationsByUser(mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        [mockUserId]
      );
      expect(result).toEqual(mockNotifications);
    });

    test('should get notifications with custom limit', async () => {
      const mockNotifications = [{ id: 1 }];
      query.mockResolvedValue(mockNotifications);

      const result = await NotificationModel.getNotificationsByUser(mockUserId, 10);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        [mockUserId]
      );
      expect(result).toEqual(mockNotifications);
    });

    test('should handle invalid limit parameters', async () => {
      const mockNotifications = [{ id: 1 }];
      query.mockResolvedValue(mockNotifications);

      // Test with string limit
      await NotificationModel.getNotificationsByUser(mockUserId, 'invalid');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        [mockUserId]
      );

      // Test with negative limit
      await NotificationModel.getNotificationsByUser(mockUserId, -5);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        [mockUserId]
      );
    });
  });

  describe('getUnreadCount', () => {
    test('should return unread count', async () => {
      const mockResult = [{ count: 5 }];
      query.mockResolvedValue(mockResult);

      const result = await NotificationModel.getUnreadCount(mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        [mockUserId]
      );
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    test('should mark notification as read', async () => {
      const mockResult = { affectedRows: 1 };
      query.mockResolvedValue(mockResult);

      const result = await NotificationModel.markAsRead(mockNotificationId, mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [mockNotificationId, mockUserId]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('markAllAsRead', () => {
    test('should mark all notifications as read', async () => {
      const mockResult = { affectedRows: 3 };
      query.mockResolvedValue(mockResult);

      const result = await NotificationModel.markAllAsRead(mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [mockUserId]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteNotification', () => {
    test('should delete notification successfully', async () => {
      const mockResult = { affectedRows: 1 };
      query.mockResolvedValue(mockResult);

      const result = await NotificationModel.deleteNotification(mockNotificationId, mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        [mockNotificationId, mockUserId]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('cleanupOldNotifications', () => {
    test('should cleanup old notifications', async () => {
      const mockResult = { affectedRows: 5 };
      query.mockResolvedValue(mockResult);

      const result = await NotificationModel.cleanupOldNotifications(mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        [mockUserId, mockUserId]
      );
      expect(result).toEqual(mockResult);
    });
  });
});