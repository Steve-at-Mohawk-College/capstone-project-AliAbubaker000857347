const { query, queryOne } = require('../config/database');

// Photo Model
const photoModel = {
    // Get all public photos with pagination
    async getPublicPhotos(page = 1, limit = 12, filters = {}) {
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

        // Use direct values in LIMIT to avoid prepared statement issues
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
            ORDER BY p.created_at DESC
            LIMIT ${numLimit} OFFSET ${numOffset}
        `;
        
        // console.log('Executing gallery query with params:', params);
        
        try {
            const photos = await query(sql, params);
            
            // Add is_favorited separately
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
            console.error('Error in getPublicPhotos:', error);
            throw error;
        }
    },

    // Get user's photos (both public and private)
    async getUserPhotos(userId, page = 1, limit = 12) {
        const offset = (page - 1) * limit;
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
            ORDER BY p.created_at DESC
            LIMIT ${numLimit} OFFSET ${numOffset}
        `;
        
        const photos = await query(sql, [userId]);
        
        // Add is_favorited separately
        for (const photo of photos) {
            const favoriteCheck = await queryOne(
                'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                [photo.photo_id, userId]
            );
            photo.is_favorited = favoriteCheck ? 1 : 0;
        }
        
        return photos;
    },

    // Get single photo by ID
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
        
        // Add is_favorited separately
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

    // Create new photo
    async createPhoto(photoData) {
        const { user_id, pet_id, photo_url, title, description, is_public = true } = photoData;
        
        const sql = `
            INSERT INTO photos (user_id, pet_id, photo_url, title, description, is_public)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const result = await query(sql, [user_id, pet_id, photo_url, title, description, is_public]);
        return result.insertId;
    },

    // Update photo
    async updatePhoto(photoId, userId, updates) {
        const allowedFields = ['title', 'description', 'is_public', 'pet_id'];
        const setClause = [];
        const params = [];
        
        // console.log('Updating photo with:', updates);
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                setClause.push(`${field} = ?`);
                
                // Handle boolean conversion for is_public
                if (field === 'is_public') {
                    let value = updates[field];
                    if (typeof value === 'boolean') {
                        params.push(value ? 1 : 0);
                    } else if (typeof value === 'string') {
                        params.push(value === 'true' || value === '1' ? 1 : 0);
                    } else {
                        params.push(value ? 1 : 0);
                    }
                    // console.log(`is_public field: ${value} -> ${params[params.length-1]}`);
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
        
        // console.log('Executing SQL:', sql);
        // console.log('With params:', params);
        
        const result = await query(sql, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Photo not found or access denied');
        }
        
        return result;
    },

    // Delete photo
    async deletePhoto(photoId, userId) {
        const sql = 'DELETE FROM photos WHERE photo_id = ? AND user_id = ?';
        const result = await query(sql, [photoId, userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Photo not found or access denied');
        }
        
        return result;
    },

    // Tag management
    async addTagToPhoto(photoId, tagName, userId) {
        // First, get or create tag
        let tag = await queryOne('SELECT tag_id FROM tags WHERE tag_name = ?', [tagName]);
        
        if (!tag) {
            // Create new tag (needs admin approval)
            const result = await query(
                'INSERT INTO tags (tag_name, is_approved, created_by) VALUES (?, 0, ?)',
                [tagName, userId]
            );
            tag = { tag_id: result.insertId };
        }
        
        // Add tag to photo
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

    // Favorite management
    async toggleFavorite(photoId, userId) {
        // Check if already favorited
        const existing = await queryOne(
            'SELECT favorite_id FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
            [photoId, userId]
        );
        
        if (existing) {
            // Remove favorite
            await query(
                'DELETE FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                [photoId, userId]
            );
            return { action: 'removed', favorite_count: await this.getFavoriteCount(photoId) };
        } else {
            // Add favorite
            await query(
                'INSERT INTO photo_favorites (photo_id, user_id) VALUES (?, ?)',
                [photoId, userId]
            );
            return { action: 'added', favorite_count: await this.getFavoriteCount(photoId) };
        }
    },

    async getFavoriteCount(photoId) {
        const result = await queryOne(
            'SELECT COUNT(*) as count FROM photo_favorites WHERE photo_id = ?',
            [photoId]
        );
        return result.count;
    },

    // Get popular tags
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
        
        // console.log('Executing popular tags query with limit:', numLimit);
        
        try {
            return await query(sql);
        } catch (error) {
            // console.error('Error in getPopularTags:', error);
            
            // Fallback
            const fallbackSql = `
                SELECT t.tag_name, COUNT(*) as usage_count
                FROM tags t
                JOIN photo_tags pt ON t.tag_id = pt.tag_id
                WHERE t.is_approved = 1
                GROUP BY t.tag_name
                ORDER BY usage_count DESC
                LIMIT ${numLimit}
            `;
            
            // console.log('Trying fallback query for popular tags');
            return await query(fallbackSql);
        }
    },

    // Get photos filtered by health status - FIXED VERSION
    async getPhotosByHealthStatus(userId, healthStatus, page = 1, limit = 12) {
        const offset = (page - 1) * limit;
        const numLimit = parseInt(limit);
        const numOffset = parseInt(offset);

        let healthCondition = '';
        const params = [userId];

        // Fixed health status conditions
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

        // Fixed SQL query - simplified and corrected
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
            ORDER BY p.created_at DESC
            LIMIT ${numLimit} OFFSET ${numOffset}
        `;

        // console.log('Health filter SQL:', sql);
        // console.log('Health filter params:', params);

        try {
            const photos = await query(sql, params);
            
            // Add is_favorited
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
            
            // Return empty array instead of throwing error for better UX
            return [];
        }
    },

    // Get health status summary for a user's pets - FIXED VERSION
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
            
            // Ensure all values are numbers and handle null cases
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
            
            // Return default values instead of throwing error
            return {
                total_pets: 0,
                healthy_pets: 0,
                underweight_pets: 0,
                overweight_pets: 0,
                needs_vaccination_pets: 0,
                recent_vet_visit_pets: 0
            };
        }
    },

    // Alternative method for popular tags without complex joins
    async getPopularTagsSimple(limit = 20) {
        const numLimit = parseInt(limit);
        
        const sql = `
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
        
        return await query(sql);
    },




// Get public photos with sorting
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

    // Add sorting logic
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
    
//    console.log('Executing gallery query with params:', params); 
    
    try {
        const photos = await query(sql, params);
        
        // Add is_favorited separately
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
        console.error('Error in getPublicPhotos:', error);
        throw error;
    }
},

// Get user's photos with sorting
async getUserPhotos(userId, page = 1, limit = 12, sortBy = 'newest') {
    const offset = (page - 1) * limit;
    
    // Add sorting logic
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
    
    // Add is_favorited separately
    for (const photo of photos) {
        const favoriteCheck = await queryOne(
            'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
            [photo.photo_id, userId]
        );
        photo.is_favorited = favoriteCheck ? 1 : 0;
    }
    
    return photos;
},

// Get health status photos with sorting
async getPhotosByHealthStatus(userId, healthStatus, page = 1, limit = 12, sortBy = 'newest') {
    const offset = (page - 1) * limit;
    const numLimit = parseInt(limit);
    const numOffset = parseInt(offset);

    let healthCondition = '';
    const params = [userId];

    // Fixed health status conditions
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

    // Add sorting logic
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

    console.log('Health filter SQL:', sql);
    console.log('Health filter params:', params);

    try {
        const photos = await query(sql, params);
        
        // Add is_favorited
        for (const photo of photos) {
            const favoriteCheck = await queryOne(
                'SELECT 1 FROM photo_favorites WHERE photo_id = ? AND user_id = ?',
                [photo.photo_id, userId]
            );
            photo.is_favorited = favoriteCheck ? 1 : 0;
        }
        
        return photos;
    } catch (error) {
        console.error('Error in getPhotosByHealthStatus:', error);
        return [];
    }
}
};

module.exports = photoModel;