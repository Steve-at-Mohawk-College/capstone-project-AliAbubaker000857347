



const express = require('express');
const router = express.Router();





// const { uploadSingle, uploadMultiple } = require('../config/upload');
const photoModel = require('../models/photoModel');
const { query } = require('../config/database');
const { uploadGallery } = require('../config/upload-cloudinary'); 

// Middleware
function requireAuth(req, res, next) {
    if (req.session?.userId) return next();
    return res.redirect('/login');
}

// Gallery homepage - public photos
router.get('/', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;
        const filters = {
            tag: req.query.tag,
            search: req.query.search,
            current_user_id: req.session.userId
        };

        const photos = await photoModel.getPublicPhotos(page, limit, filters);
        const popularTags = await photoModel.getPopularTags();

        res.render('gallery/index', {
            title: 'Community Gallery - Pet Care',
            photos,
            popularTags,
            currentPage: page,
            currentTag: req.query.tag,
            currentSearch: req.query.search,
            hasMore: photos.length === limit
        });
    } catch (error) {
        console.error('Gallery error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading gallery.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// My photos page
router.get('/my-photos', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;

        const photos = await photoModel.getUserPhotos(req.session.userId, page, limit);

        res.render('gallery/my-photos', {
            title: 'My Photos - Pet Care',
            photos,
            currentPage: page,
            hasMore: photos.length === limit
        });
    } catch (error) {
        console.error('My photos error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading your photos.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Upload photo page

router.get('/upload', requireAuth, async (req, res) => {
    try {
        // Get user's pets for tagging
        let pets = [];
        try {
            pets = await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]);
        } catch (dbError) {
            console.error('Error fetching pets:', dbError);
            // Continue with empty pets array
        }
        
        res.render('gallery/upload', {
            title: 'Upload Photo - Pet Care',
            pets,
            error: null,
            formData: {}
        });
    } catch (error) {
        console.error('Upload form error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading upload form.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});


// // Handle photo upload (single for regular users)
// router.post('/upload', requireAuth, upload.single('photo'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).render('gallery/upload', {
//                 title: 'Upload Photo - Pet Care',
//                 pets: await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]),
//                 error: 'Please select a photo to upload.',
//                 formData: req.body
//             });
//         }

//         const { title, description, is_public, pet_id, tags } = req.body;
        
//         // Create photo record
//         const photoId = await photoModel.createPhoto({
//             user_id: req.session.userId,
//             pet_id: pet_id || null,
//             photo_url: `/uploads/profile-pictures/${req.file.filename}`,
//             title: title || 'Untitled',
//             description: description || '',
//             is_public: is_public === 'on' ? 1 : 0
//         });

//         // Process tags
//         if (tags) {
//             const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
//             for (const tagName of tagList) {
//                 try {
//                     await photoModel.addTagToPhoto(photoId, tagName, req.session.userId);
//                 } catch (tagError) {
//                     console.log('Tag error (non-critical):', tagError.message);
//                 }
//             }
//         }

//         res.redirect('/gallery/my-photos?message=Photo uploaded successfully!');
//     } catch (error) {
//         console.error('Upload error:', error);
//         res.status(500).render('gallery/upload', {
//             title: 'Upload Photo - Pet Care',
//             pets: await query('SELECT * FROM pets WHERE user_id = ?', [req.session.userId]),
//             error: 'Error uploading photo: ' + error.message,
//             formData: req.body
//         });
//     }
// });


router.post('/upload', requireAuth, uploadGallery, async (req, res) => {
    try {
        console.log("Gallery upload - Cloudinary result:", req.cloudinaryResult);
        console.log("Gallery upload - File:", req.file);

        if (!req.cloudinaryResult) {
            return res.status(400).render('gallery/upload', {
                title: 'Upload Photo - Pet Care',
                pets: await getUsersPets(req.session.userId),
                error: 'Please select a photo to upload or upload failed.',
                formData: req.body
            });
        }

        const { title, description, is_public, pet_id, tags } = req.body;
        
        // Get Cloudinary URL from the new approach
        const photoUrl = req.cloudinaryResult.secure_url;
        
        console.log('Uploaded photo URL:', photoUrl);

        // Create photo record
        const photoId = await photoModel.createPhoto({
            user_id: req.session.userId,
            pet_id: pet_id || null,
            photo_url: photoUrl, // Cloudinary URL
            title: title || 'Untitled',
            description: description || '',
            is_public: is_public === 'on' ? 1 : 0
        });

        // Process tags
        if (tags) {
            const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            for (const tagName of tagList) {
                try {
                    await photoModel.addTagToPhoto(photoId, tagName, req.session.userId);
                } catch (tagError) {
                    console.log('Tag error (non-critical):', tagError.message);
                }
            }
        }

        res.redirect('/gallery/my-photos?message=Photo uploaded successfully!');
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).render('gallery/upload', {
            title: 'Upload Photo - Pet Care',
            pets: await getUsersPets(req.session.userId),
            error: 'Error uploading photo: ' + error.message,
            formData: req.body
        });
    }
});



// async function handlePhotoUpload(req, res) {
//     try {
//         if (!req.file) {
//             return res.status(400).render('gallery/upload', {
//                 title: 'Upload Photo - Pet Care',
//                 pets: await getUsersPets(req.session.userId),
//                 error: 'Please select a photo to upload.',
//                 formData: req.body
//             });
//         }

//         const { title, description, is_public, pet_id, tags } = req.body;
        
//         // Create photo record
//         const photoId = await photoModel.createPhoto({
//             user_id: req.session.userId,
//             pet_id: pet_id || null,
//             photo_url: `/uploads/gallery/${req.file.filename}`, // Note: gallery directory
//             title: title || 'Untitled',
//             description: description || '',
//             is_public: is_public === 'on' ? 1 : 0
//         });

//         // Process tags
//         if (tags) {
//             const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
//             for (const tagName of tagList) {
//                 try {
//                     await photoModel.addTagToPhoto(photoId, tagName, req.session.userId);
//                 } catch (tagError) {
//                     console.log('Tag error (non-critical):', tagError.message);
//                 }
//             }
//         }

//         res.redirect('/gallery/my-photos?message=Photo uploaded successfully!');
//     } catch (error) {
//         console.error('Upload error:', error);
//         res.status(500).render('gallery/upload', {
//             title: 'Upload Photo - Pet Care',
//             pets: await getUsersPets(req.session.userId),
//             error: 'Error uploading photo: ' + error.message,
//             formData: req.body
//         });
//     }
// }













// Helper function to get user's pets
async function getUsersPets(userId) {
    return await query('SELECT * FROM pets WHERE user_id = ?', [userId]);
}



// View single photo
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
        console.error('Photo detail error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading photo.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// API Routes for AJAX actions

// Toggle favorite
router.post('/photo/:id/favorite', requireAuth, async (req, res) => {
    try {
        const result = await photoModel.toggleFavorite(req.params.id, req.session.userId);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Favorite error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add tag to photo
router.post('/photo/:id/tags', requireAuth, async (req, res) => {
    try {
        const { tag } = req.body;
        
        if (!tag || tag.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Tag is required' });
        }

        await photoModel.addTagToPhoto(req.params.id, tag.trim(), req.session.userId);
        res.json({ success: true, message: 'Tag added successfully' });
    } catch (error) {
        console.error('Add tag error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove tag from photo
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
        console.error('Remove tag error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update photo details

router.put('/photo/:id', requireAuth, async (req, res) => {
    try {
        const { title, description, is_public, pet_id } = req.body;
        
        console.log('Update photo request:', {
            photoId: req.params.id,
            userId: req.session.userId,
            title,
            description,
            is_public,
            is_public_type: typeof is_public,
            pet_id
        });

        // Convert is_public to proper boolean/INT for MySQL
        let isPublicValue;
        if (typeof is_public === 'boolean') {
            isPublicValue = is_public ? 1 : 0;
        } else if (typeof is_public === 'string') {
            isPublicValue = (is_public === 'true' || is_public === '1') ? 1 : 0;
        } else if (typeof is_public === 'number') {
            isPublicValue = is_public ? 1 : 0;
        } else {
            isPublicValue = 0; // Default to private if unclear
        }

        console.log('Processed is_public value:', isPublicValue);

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
        console.error('Update photo error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            receivedData: req.body
        });
    }
});

// Delete photo
router.delete('/photo/:id', requireAuth, async (req, res) => {
    try {
        await photoModel.deletePhoto(req.params.id, req.session.userId);
        res.json({ success: true, message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;