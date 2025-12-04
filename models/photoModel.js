const { query, queryOne } = require('../config/database');

const photoModel = {
    /**
     * Retrieves public photos with filtering and pagination.
     * 
     * @param {number} [page=1] - Page number for pagination
     * @param {number} [limit=12] - Number of photos per page
     * @param {Object} [filters={}] - Filtering options
     * @param {string} [filters.tag] - Filter by tag name
     * @param {number} [filters.user_id] - Filter by user ID
     * @param {string} [filters.search] - Search in title and description
     * @param {string} [filters.current_user_id] - User ID for checking favorites
     * @param {string} [sortBy='newest'] - Sorting method ('newest', 'oldest', 'popular')
     * @returns {Promise<Array>} Array of photo objects with metadata
     */
    async getPublicPhotos(page = 1, limit = 12, filters = {}, sortBy = 'newest') {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE p.is_public = 1';
        const params = [];
        
        if (filters.tag) {
            whereClause += ' AND t.tag_name = ?';
            params.push(filters.tag);
        }
        
        if (filters.user_id) {
            whereClause += ' AND p.user_id = ?';
            params.push(filters.user_id);
        }
        
        if (filters.search) {
            whereClause += ' AND (p.title LIKE ? OR p.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        let orderByClause = '';
        switch (sortBy) {
            case 'oldest':
                orderByClause = 'ORDER BY p.created_at ASC';
                break;
            case 'popular':
                orderByClause = 'ORDER BY favorite_count DESC, p.created_at DESC';
                break;
            case 'newest':
            default:
                orderByClause = 'ORDER BY p.created_at DESC';
                break;
        }

        const numLimit = parseInt(limit);
        const numOffset = parseInt(offset);
        
        const sql = `
            SELECT 
                p.*,
                u.username,
                u.profile_picture_url,
                COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags,
                COALESCE(COUNT(DISTINCT pf.favorite_id), 0) as favorite_count
            FROM photos p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN photo_tags pt ON p.photo_id = pt.photo_id
            LEFT JOIN tags t ON pt.tag_id = t.tag_id
            LEFT JOIN photo_favorites pf ON p.photo_id = pf.photo_id
            ${whereClause}
            GROUP BY p.photo_id, u.username, u.profile_picture_url
            ${orderByClause}
            LIMIT ${numLimit} OFFSET ${numOffset}
        `;
        
        try {
            const photos = await query(sql, params);
            
            if (filters.current_user_id) {
                for (const photo of photos) {
                    const favoriteCheck = await queryOne(
                        'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                        [photo.photo_id, filters.current_user_id]
                    );
                    photo.is_favorited = favoriteCheck ? 1 : 0;
                }
            } else {
                for (const photo of photos) {
                    photo.is_favorited = 0;
                }
            }
            
            return photos;
        } catch (error) {
            // console.error('Error in getPublicPhotos:', error);
            throw error;
        }
    },

    /**
     * Retrieves photos belonging to a specific user.
     * 
     * @param {number} userId - ID of the user
     * @param {number} [page=1] - Page number for pagination
     * @param {number} [limit=12] - Number of photos per page
     * @param {string} [sortBy='newest'] - Sorting method ('newest', 'oldest', 'popular')
     * @returns {Promise<Array>} Array of user's photo objects
     */
    async getUserPhotos(userId, page = 1, limit = 12, sortBy = 'newest') {
        const offset = (page - 1) * limit;
        
        let orderByClause = '';
        switch (sortBy) {
            case 'oldest':
                orderByClause = 'ORDER BY p.created_at ASC';
                break;
            case 'popular':
                orderByClause = 'ORDER BY favorite_count DESC, p.created_at DESC';
                break;
            case 'newest':
            default:
                orderByClause = 'ORDER BY p.created_at DESC';
                break;
        }

        const numLimit = parseInt(limit);
        const numOffset = parseInt(offset);
        
        const sql = `
            SELECT p.*, 
                   COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags,
                   COALESCE(COUNT(DISTINCT pf.favorite_id), 0) as favorite_count
            FROM photos p
            LEFT JOIN photo_tags pt ON p.photo_id = pt.photo_id
            LEFT JOIN tags t ON pt.tag_id = t.tag_id
            LEFT JOIN photo_favorites pf ON p.photo_id = pf.photo_id
            WHERE p.user_id = ?
            GROUP BY p.photo_id
            ${orderByClause}
            LIMIT ${numLimit} OFFSET ${numOffset}
        `;
        
        const photos = await query(sql, [userId]);
        
        for (const photo of photos) {
            const favoriteCheck = await queryOne(
                'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                [photo.photo_id, userId]
            );
            photo.is_favorited = favoriteCheck ? 1 : 0;
        }
        
        return photos;
    },

    /**
     * Retrieves a single photo by ID with user permission check.
     * 
     * @param {number} photoId - ID of the photo
     * @param {number|null} [userId=null] - User ID for permission check (can view private photos if owner)
     * @returns {Promise<Object|null>} Photo object with metadata or null if not found/accessible
     */
    async getPhotoById(photoId, userId = null) {
        let whereClause = 'WHERE p.photo_id = ?';
        const params = [photoId];
        
        if (userId) {
            whereClause += ' AND (p.is_public = 1 OR p.user_id = ?)';
            params.push(userId);
        } else {
            whereClause += ' AND p.is_public = 1';
        }

        const sql = `
            SELECT p.*, u.username, u.profile_picture_url,
                   COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags,
                   COALESCE(COUNT(DISTINCT pf.favorite_id), 0) as favorite_count
            FROM photos p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN photo_tags pt ON p.photo_id = pt.photo_id
            LEFT JOIN tags t ON pt.tag_id = t.tag_id
            LEFT JOIN photo_favorites pf ON p.photo_id = pf.photo_id
            ${whereClause}
            GROUP BY p.photo_id, u.username, u.profile_picture_url
        `;
        
        const photos = await query(sql, params);
        const photo = photos[0] || null;
        
        if (photo && userId) {
            const favoriteCheck = await queryOne(
                'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                [photo.photo_id, userId]
            );
            photo.is_favorited = favoriteCheck ? 1 : 0;
        } else if (photo) {
            photo.is_favorited = 0;
        }
        
        return photo;
    },

    /**
     * Creates a new photo record.
     * 
     * @param {Object} photoData - Photo data
     * @param {number} photoData.user_id - User ID of the uploader
     * @param {number|null} photoData.pet_id - Associated pet ID (optional)
     * @param {string} photoData.photo_url - Cloudinary URL of the photo
     * @param {string} photoData.title - Photo title
     * @param {string} photoData.description - Photo description
     * @param {boolean} [photoData.is_public=true] - Whether photo is public
     * @returns {Promise<number>} Insert ID of the new photo
     */
    async createPhoto(photoData) {
        const { user_id, pet_id, photo_url, title, description, is_public = true } = photoData;
        
        const sql = `
            INSERT INTO photos (user_id, pet_id, photo_url, title, description, is_public)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const result = await query(sql, [user_id, pet_id, photo_url, title, description, is_public]);
        return result.insertId;
    },

    /**
     * Updates an existing photo (only by owner).
     * 
     * @param {number} photoId - ID of the photo to update
     * @param {number} userId - User ID of the owner
     * @param {Object} updates - Fields to update
     * @param {string} [updates.title] - New title
     * @param {string} [updates.description] - New description
     * @param {boolean|string} [updates.is_public] - New visibility status
     * @param {number} [updates.pet_id] - New associated pet ID
     * @returns {Promise<Object>} Database update result
     * @throws {Error} If photo not found or access denied
     */
    async updatePhoto(photoId, userId, updates) {
        const allowedFields = ['title', 'description', 'is_public', 'pet_id'];
        const setClause = [];
        const params = [];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                setClause.push(`${field} = ?`);
                
                if (field === 'is_public') {
                    let value = updates[field];
                    if (typeof value === 'boolean') {
                        params.push(value ? 1 : 0);
                    } else if (typeof value === 'string') {
                        params.push(value === 'true' || value === '1' ? 1 : 0);
                    } else {
                        params.push(value ? 1 : 0);
                    }
                } else {
                    params.push(updates[field]);
                }
            }
        });
        
        if (setClause.length === 0) {
            throw new Error('No valid fields to update');
        }
        
        params.push(photoId, userId);
        
        const sql = `UPDATE photos SET ${setClause.join(', ')} WHERE photo_id = ? AND user_id = ?`;
        
        const result = await query(sql, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Photo not found or access denied');
        }
        
        return result;
    },

    /**
     * Deletes a photo (only by owner).
     * 
     * @param {number} photoId - ID of the photo to delete
     * @param {number} userId - User ID of the owner
     * @returns {Promise<Object>} Database delete result
     * @throws {Error} If photo not found or access denied
     */
    async deletePhoto(photoId, userId) {
        const sql = 'DELETE FROM photos WHERE photo_id = ? AND user_id = ?';
        const result = await query(sql, [photoId, userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Photo not found or access denied');
        }
        
        return result;
    },

    /**
     * Adds a tag to a photo. Creates tag if it doesn't exist (requires admin approval).
     * 
     * @param {number} photoId - ID of the photo
     * @param {string} tagName - Name of the tag to add
     * @param {number} userId - User ID adding the tag
     * @returns {Promise<boolean>} True if tag was added successfully
     * @throws {Error} If tag already exists on photo
     */
    async addTagToPhoto(photoId, tagName, userId) {
        let tag = await queryOne('SELECT tag_id FROM tags WHERE tag_name = ?', [tagName]);
        
        if (!tag) {
            const result = await query(
                'INSERT INTO tags (tag_name, is_approved, created_by) VALUES (?, 0, ?)',
                [tagName, userId]
            );
            tag = { tag_id: result.insertId };
        }
        
        try {
            await query(
                'INSERT INTO photo_tags (photo_id, tag_id, added_by) VALUES (?, ?, ?)',
                [photoId, tag.tag_id, userId]
            );
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Tag already added to this photo');
            }
            throw error;
        }
    },

    /**
     * Removes a tag from a photo (only by tag adder or photo owner).
     * 
     * @param {number} photoId - ID of the photo
     * @param {number} tagId - ID of the tag to remove
     * @param {number} userId - User ID removing the tag
     * @returns {Promise<boolean>} True if tag was removed successfully
     */
    async removeTagFromPhoto(photoId, tagId, userId) {
        const sql = `
            DELETE pt FROM photo_tags pt
            JOIN photos p ON pt.photo_id = p.photo_id
            WHERE pt.photo_id = ? AND pt.tag_id = ? 
            AND (pt.added_by = ? OR p.user_id = ?)
        `;
        
        const result = await query(sql, [photoId, tagId, userId, userId]);
        return result.affectedRows > 0;
    },

    /**
     * Toggles favorite status of a photo for a user.
     * 
     * @param {number} photoId - ID of the photo
     * @param {number} userId - User ID toggling favorite
     * @returns {Promise<Object>} Result with action and updated favorite count
     */
    async toggleFavorite(photoId, userId) {
        const existing = await queryOne(
            'SELECT favorite_id FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
            [photoId, userId]
        );
        
        if (existing) {
            await query(
                'DELETE FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                [photoId, userId]
            );
            return { action: 'removed', favorite_count: await this.getFavoriteCount(photoId) };
        } else {
            await query(
                'INSERT INTO photo_favorites (photo_id, user_id) VALUES (?, ?)',
                [photoId, userId]
            );
            return { action: 'added', favorite_count: await this.getFavoriteCount(photoId) };
        }
    },

    /**
     * Gets the favorite count for a photo.
     * 
     * @param {number} photoId - ID of the photo
     * @returns {Promise<number>} Number of favorites
     */
    async getFavoriteCount(photoId) {
        const result = await queryOne(
            'SELECT COUNT(*) as count FROM photo_favorites WHERE photo_id = ?',
            [photoId]
        );
        return result.count;
    },

    /**
     * Gets popular tags based on usage count.
     * 
     * @param {number} [limit=20] - Maximum number of tags to return
     * @returns {Promise<Array>} Array of popular tag objects
     */
    async getPopularTags(limit = 20) {
        const numLimit = parseInt(limit);
        
        const sql = `
            SELECT t.tag_name, COUNT(pt.photo_tag_id) as usage_count
            FROM tags t
            JOIN photo_tags pt ON t.tag_id = pt.tag_id
            WHERE t.is_approved = 1
            GROUP BY t.tag_id, t.tag_name
            ORDER BY usage_count DESC
            LIMIT ${numLimit}
        `;
        
        try {
            return await query(sql);
        } catch (error) {
            const fallbackSql = `
                SELECT tag_name, COUNT(*) as usage_count 
                FROM (
                    SELECT t.tag_name
                    FROM photo_tags pt
                    JOIN tags t ON pt.tag_id = t.tag_id
                    WHERE t.is_approved = 1
                ) as tag_usage
                GROUP BY tag_name
                ORDER BY usage_count DESC
                LIMIT ${numLimit}
            `;
            
            return await query(fallbackSql);
        }
    },

    /**
     * Retrieves photos filtered by pet health status.
     * 
     * @param {number} userId - User ID to filter photos
     * @param {string} healthStatus - Health status to filter by ('healthy', 'needs_vaccination', 'underweight', 'overweight', 'recent_vet_visit')
     * @param {number} [page=1] - Page number for pagination
     * @param {number} [limit=12] - Number of photos per page
     * @param {string} [sortBy='newest'] - Sorting method ('newest', 'oldest', 'popular')
     * @returns {Promise<Array>} Array of photos with health metadata
     */
    async getPhotosByHealthStatus(userId, healthStatus, page = 1, limit = 12, sortBy = 'newest') {
        const offset = (page - 1) * limit;
        const numLimit = parseInt(limit);
        const numOffset = parseInt(offset);

        let healthCondition = '';
        const params = [userId];

        switch (healthStatus) {
            case 'healthy':
                healthCondition = `
                    AND (ht.weight IS NOT NULL AND ht.weight BETWEEN 1 AND 200)
                    AND (ht.vaccination_date IS NULL OR ht.vaccination_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR))
                    AND (ht.next_vaccination_date IS NULL OR ht.next_vaccination_date >= CURDATE())
                `;
                break;
            case 'needs_vaccination':
                healthCondition = `
                    AND (ht.vaccination_date IS NULL OR ht.vaccination_date < DATE_SUB(CURDATE(), INTERVAL 1 YEAR))
                    AND (ht.next_vaccination_date IS NULL OR ht.next_vaccination_date < CURDATE())
                `;
                break;
            case 'underweight':
                healthCondition = 'AND ht.weight IS NOT NULL AND ht.weight < 1';
                break;
            case 'overweight':
                healthCondition = 'AND ht.weight IS NOT NULL AND ht.weight > 200';
                break;
            case 'recent_vet_visit':
                healthCondition = 'AND ht.vet_visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                break;
            default:
                healthCondition = '';
        }

        let orderByClause = '';
        switch (sortBy) {
            case 'oldest':
                orderByClause = 'ORDER BY p.created_at ASC';
                break;
            case 'popular':
                orderByClause = 'ORDER BY favorite_count DESC, p.created_at DESC';
                break;
            case 'newest':
            default:
                orderByClause = 'ORDER BY p.created_at DESC';
                break;
        }

        const sql = `
            SELECT DISTINCT 
                p.*,
                u.username,
                u.profile_picture_url,
                COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags,
                COALESCE(COUNT(DISTINCT pf.favorite_id), 0) as favorite_count,
                ht.weight,
                ht.vaccination_date,
                ht.next_vaccination_date,
                ht.vet_visit_date,
                pet.name as pet_name
            FROM photos p
            INNER JOIN users u ON p.user_id = u.user_id
            LEFT JOIN photo_tags pt ON p.photo_id = pt.photo_id
            LEFT JOIN tags t ON pt.tag_id = t.tag_id
            LEFT JOIN photo_favorites pf ON p.photo_id = pf.photo_id
            LEFT JOIN pets pet ON p.pet_id = pet.pet_id
            LEFT JOIN health_tracker ht ON pet.pet_id = ht.pet_id
            WHERE p.user_id = ? 
            AND p.is_public = 1
            AND pet.pet_id IS NOT NULL
            AND ht.health_id IS NOT NULL
            ${healthCondition}
            GROUP BY p.photo_id, u.username, u.profile_picture_url, 
                     ht.weight, ht.vaccination_date, ht.next_vaccination_date, 
                     ht.vet_visit_date, pet.name
            ${orderByClause}
            LIMIT ${numLimit} OFFSET ${numOffset}
        `;

        try {
            const photos = await query(sql, params);
            
            for (const photo of photos) {
                const favoriteCheck = await queryOne(
                    'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                    [photo.photo_id, userId]
                );
                photo.is_favorited = favoriteCheck ? 1 : 0;
            }
            
            return photos;
        } catch (error) {
            // console.error('Error in getPhotosByHealthStatus:', error);
            return [];
        }
    },

    /**
     * Gets health status summary statistics for a user's pets.
     * 
     * @param {number} userId - User ID to get health summary for
     * @returns {Promise<Object>} Health status summary object with counts
     */
    async getHealthStatusSummary(userId) {
        const sql = `
            SELECT 
                COUNT(DISTINCT pet.pet_id) as total_pets,
                SUM(CASE 
                    WHEN ht.weight BETWEEN 1 AND 200 
                    AND (ht.vaccination_date IS NULL OR ht.vaccination_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR))
                    AND (ht.next_vaccination_date IS NULL OR ht.next_vaccination_date >= CURDATE())
                    THEN 1 ELSE 0 
                END) as healthy_pets,
                SUM(CASE WHEN ht.weight < 1 THEN 1 ELSE 0 END) as underweight_pets,
                SUM(CASE WHEN ht.weight > 200 THEN 1 ELSE 0 END) as overweight_pets,
                SUM(CASE 
                    WHEN ht.vaccination_date < DATE_SUB(CURDATE(), INTERVAL 1 YEAR) 
                    OR ht.next_vaccination_date < CURDATE() 
                    THEN 1 ELSE 0 
                END) as needs_vaccination_pets,
                SUM(CASE WHEN ht.vet_visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_vet_visit_pets
            FROM pets pet
            LEFT JOIN health_tracker ht ON pet.pet_id = ht.pet_id
            WHERE pet.user_id = ?
            AND ht.health_id IS NOT NULL
        `;

        try {
            const result = await queryOne(sql, [userId]);
            
            return {
                total_pets: parseInt(result?.total_pets || 0),
                healthy_pets: parseInt(result?.healthy_pets || 0),
                underweight_pets: parseInt(result?.underweight_pets || 0),
                overweight_pets: parseInt(result?.overweight_pets || 0),
                needs_vaccination_pets: parseInt(result?.needs_vaccination_pets || 0),
                recent_vet_visit_pets: parseInt(result?.recent_vet_visit_pets || 0)
            };
        } catch (error) {
            // console.error('Error in getHealthStatusSummary:', error);
            
            return {
                total_pets: 0,
                healthy_pets: 0,
                underweight_pets: 0,
                overweight_pets: 0,
                needs_vaccination_pets: 0,
                recent_vet_visit_pets: 0
            };
        }
    }
};

module.exports = photoModel;