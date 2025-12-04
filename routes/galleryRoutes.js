const express = require('express');
const router = express.Router();
const photoModel = require('../models/photoModel');
const { query } = require('../config/database');
const { uploadGallery } = require('../config/upload-cloudinary');

/**
 * Middleware to require authentication for gallery routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
    if (req.session?.userId) return next();
    return res.redirect('/login');
}

/**
 * GET /gallery - Renders the main gallery page with public photos.
 * Supports pagination, filtering by tags/search, and sorting options.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;
        const sortBy = req.query.sort || 'newest';

        const filters = {
            tag: req.query.tag,
            search: req.query.search,
            current_user_id: req.session.userId
        };

        const photos = await photoModel.getPublicPhotos(page, limit, filters, sortBy);
        const popularTags = await photoModel.getPopularTags();

        res.render('gallery/index', {
            title: 'Community Gallery - Pet Care',
            photos,
            popularTags,
            currentPage: page,
            currentTag: req.query.tag,
            currentSearch: req.query.search,
            currentSort: sortBy,
            hasMore: photos.length === limit
        });
    } catch (error) {
        // console.error('Gallery error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading gallery.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * GET /gallery/my-photos - Renders user's personal photo gallery.
 * Supports pagination and sorting of user's uploaded photos.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/my-photos', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;
        const sortBy = req.query.sort || 'newest';

        const photos = await photoModel.getUserPhotos(req.session.userId, page, limit, sortBy);

        res.render('gallery/my-photos', {
            title: 'My Photos - Pet Care',
            photos,
            currentPage: page,
            currentSort: sortBy,
            hasMore: photos.length === limit
        });
    } catch (error) {
        // console.error('My photos error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading your photos.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * GET /gallery/health-status/:status - Renders gallery filtered by pet health status.
 * Shows photos of pets with specific health conditions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/health-status/:status', requireAuth, async (req, res) => {
    try {
        const healthStatus = req.params.status;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;
        const sortBy = req.query.sort || 'newest';

        const validStatuses = ['healthy', 'needs_vaccination', 'underweight', 'overweight', 'recent_vet_visit'];

        if (!validStatuses.includes(healthStatus)) {
            return res.redirect('/gallery');
        }

        const filters = {
            current_user_id: req.session.userId
        };

        const photos = await photoModel.getPhotosByHealthStatus(
            req.session.userId,
            healthStatus,
            page,
            limit,
            sortBy
        );

        const popularTags = await photoModel.getPopularTags();
        const healthSummary = await photoModel.getHealthStatusSummary(req.session.userId);

        const statusLabels = {
            'healthy': 'Healthy Pets',
            'needs_vaccination': 'Needs Vaccination',
            'underweight': 'Underweight Pets',
            'overweight': 'Overweight Pets',
            'recent_vet_visit': 'Recent Vet Visits'
        };

        res.render('gallery/health-gallery', {
            title: `${statusLabels[healthStatus]} - Pet Care Gallery`,
            photos,
            popularTags,
            healthSummary,
            currentPage: page,
            currentHealthStatus: healthStatus,
            currentSort: sortBy,
            statusLabels,
            hasMore: photos.length === limit
        });
    } catch (error) {
        // console.error('Health gallery error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading health-filtered gallery.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * GET /gallery/upload - Renders photo upload form.
 * Pre-populates form with user's pets for association.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/upload', requireAuth, async (req, res) => {
    try {
        let pets = [];
        try {
            pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
        } catch (dbError) {
            // console.error('Error fetching pets:', dbError);
        }

        res.render('gallery/upload', {
            title: 'Upload Photo - Pet Care',
            pets,
            error: null,
            formData: {},
            isAdmin: req.session?.role === 'admin'
        });
    } catch (error) {
        // console.error('Upload form error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading upload form.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * POST /gallery/upload - Handles photo upload to Cloudinary.
 * Supports single upload for regular users and multiple upload for admins.
 * Processes tags and associates photos with pets.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/upload', requireAuth, uploadGallery, async (req, res) => {
    try {
        const isAdmin = req.session?.role === 'admin';

        if (isAdmin && (!req.cloudinaryResults || req.cloudinaryResults.length === 0)) {
            return renderUploadError(res, 'Please select photos to upload.', req.body);
        }

        if (!isAdmin && !req.cloudinaryResult) {
            return renderUploadError(res, 'Please select a photo to upload.', req.body);
        }

        const { title, description, is_public, pet_id, tags } = req.body;

        if (isAdmin) {
            let successCount = 0;
            let errorCount = 0;

            for (const cloudinaryResult of req.cloudinaryResults) {
                try {
                    const photoId = await photoModel.createPhoto({
                        user_id: req.session.userId,
                        pet_id: pet_id || null,
                        photo_url: cloudinaryResult.secure_url,
                        title: title || `Admin Upload ${successCount + 1}`,
                        description: description || '',
                        is_public: is_public === 'on' ? 1 : 0
                    });

                    await processTags(photoId, tags, req.session.userId);
                    successCount++;
                } catch (photoError) {
                    // console.error('Error creating photo record:', photoError);
                    errorCount++;
                }
            }

            const message = `Uploaded ${successCount} photos successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
            res.redirect(`/gallery/my-photos?message=${encodeURIComponent(message)}`);
        } else {
            const photoUrl = req.cloudinaryResult.secure_url;

            const photoId = await photoModel.createPhoto({
                user_id: req.session.userId,
                pet_id: pet_id || null,
                photo_url: photoUrl,
                title: title || 'Untitled',
                description: description || '',
                is_public: is_public === 'on' ? 1 : 0
            });

            await processTags(photoId, tags, req.session.userId);
            res.redirect('/gallery/my-photos?message=Photo uploaded successfully!');
        }
    } catch (error) {
        // console.error('Upload error:', error);
        renderUploadError(res, 'Error uploading photo: ' + error.message, req.body);
    }
});

/**
 * Processes and adds tags to a photo.
 * 
 * @param {number} photoId - ID of the photo
 * @param {string} tags - Comma-separated tag string
 * @param {number} userId - ID of the user adding tags
 */
async function processTags(photoId, tags, userId) {
    if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        for (const tagName of tagList) {
            try {
                await photoModel.addTagToPhoto(photoId, tagName, userId);
            } catch (tagError) {
                // console.log('Tag error (non-critical):', tagError.message);
            }
        }
    }
}

/**
 * Renders upload error page with form data preserved.
 * 
 * @param {Object} res - Express response object
 * @param {string} errorMessage - Error message to display
 * @param {Object} formData - Form data to repopulate
 */
async function renderUploadError(res, errorMessage, formData = {}) {
    const pets = await getUsersPets(res.locals.userId);
    res.status(500).render('gallery/upload', {
        title: 'Upload Photo - Pet Care',
        pets,
        error: errorMessage,
        formData,
        isAdmin: res.locals.role === 'admin'
    });
}

/**
 * Retrieves user's pets from database.
 * 
 * @param {number} userId - ID of the user
 * @returns {Promise<Array>} Array of pet objects
 */
async function getUsersPets(userId) {
    try {
        return await query('SELECT * FROM pets WHERE user_id = ?', [userId]);
    } catch (error) {
        // console.error('Error fetching pets:', error);
        return [];
    }
}

/**
 * GET /gallery/health-overview - Renders pet health overview dashboard.
 * Shows health statistics summary for user's pets.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/health-overview', requireAuth, async (req, res) => {
    try {
        const healthSummary = await photoModel.getHealthStatusSummary(req.session.userId);

        res.render('gallery/health-overview', {
            title: 'Pet Health Overview - Gallery',
            healthSummary
        });
    } catch (error) {
        // console.error('Health overview error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading health overview.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * GET /gallery/photo/:id - Renders detailed view of a single photo.
 * Shows photo metadata, tags, and interactive features.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/photo/:id', requireAuth, async (req, res) => {
    try {
        const photo = await photoModel.getPhotoById(req.params.id, req.session.userId);

        if (!photo) {
            return res.status(404).render('error', {
                title: 'Photo Not Found',
                message: 'The requested photo was not found or is private.',
                error: {}
            });
        }

        res.render('gallery/photo-detail', {
            title: `${photo.title} - Pet Care Gallery`,
            photo
        });
    } catch (error) {
        // console.error('Photo detail error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading photo.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * POST /gallery/photo/:id/favorite - Toggles favorite status for a photo.
 * API endpoint for AJAX favorite toggling.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/photo/:id/favorite', requireAuth, async (req, res) => {
    try {
        const result = await photoModel.toggleFavorite(req.params.id, req.session.userId);
        res.json({ success: true, ...result });
    } catch (error) {
        // console.error('Favorite error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /gallery/photo/:id/tags - Adds a tag to a photo.
 * API endpoint for AJAX tag addition.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.post('/photo/:id/tags', requireAuth, async (req, res) => {
    try {
        const { tag } = req.body;

        if (!tag || tag.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Tag is required' });
        }

        await photoModel.addTagToPhoto(req.params.id, tag.trim(), req.session.userId);
        res.json({ success: true, message: 'Tag added successfully' });
    } catch (error) {
        // console.error('Add tag error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /gallery/photo/:photoId/tags/:tagId - Removes a tag from a photo.
 * API endpoint for AJAX tag removal.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.delete('/photo/:photoId/tags/:tagId', requireAuth, async (req, res) => {
    try {
        const success = await photoModel.removeTagFromPhoto(
            req.params.photoId,
            req.params.tagId,
            req.session.userId
        );

        if (success) {
            res.json({ success: true, message: 'Tag removed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Tag not found or access denied' });
        }
    } catch (error) {
        // console.error('Remove tag error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /gallery/photo/:id - Updates photo metadata.
 * API endpoint for editing photo title, description, visibility, and pet association.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.put('/photo/:id', requireAuth, async (req, res) => {
    try {
        const { title, description, is_public, pet_id } = req.body;

        let isPublicValue;
        if (typeof is_public === 'boolean') {
            isPublicValue = is_public ? 1 : 0;
        } else if (typeof is_public === 'string') {
            isPublicValue = (is_public === 'true' || is_public === '1') ? 1 : 0;
        } else if (typeof is_public === 'number') {
            isPublicValue = is_public ? 1 : 0;
        } else {
            isPublicValue = 0;
        }

        await photoModel.updatePhoto(req.params.id, req.session.userId, {
            title,
            description,
            is_public: isPublicValue,
            pet_id: pet_id || null
        });

        res.json({
            success: true,
            message: 'Photo updated successfully',
            updatedFields: { title, description, is_public: isPublicValue }
        });
    } catch (error) {
        // console.error('Update photo error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            receivedData: req.body
        });
    }
});

/**
 * DELETE /gallery/photo/:id - Deletes a photo.
 * API endpoint for photo deletion with ownership validation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.delete('/photo/:id', requireAuth, async (req, res) => {
    try {
        await photoModel.deletePhoto(req.params.id, req.session.userId);
        res.json({ success: true, message: 'Photo deleted successfully' });
    } catch (error) {
        // console.error('Delete photo error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;