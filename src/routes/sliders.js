const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

// Get all active sliders
router.get('/', optionalAuth, async (req, res) => {
  try {
    const sliders = await prisma.slider.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    res.json({
      success: true,
      data: sliders
    });
  } catch (error) {
    console.error('Get sliders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sliders',
      error: error.message
    });
  }
});

// Get all sliders (Admin only)
router.get('/all', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const sliders = await prisma.slider.findMany({
      orderBy: { order: 'asc' }
    });

    res.json({
      success: true,
      data: sliders
    });
  } catch (error) {
    console.error('Get all sliders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sliders',
      error: error.message
    });
  }
});

// Get slider by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const slider = await prisma.slider.findUnique({
      where: { id }
    });

    if (!slider || !slider.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Slider not found'
      });
    }

    res.json({
      success: true,
      data: slider
    });
  } catch (error) {
    console.error('Get slider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slider',
      error: error.message
    });
  }
});

// Create slider (Admin only)
router.post('/', authenticate, authorize('ADMIN'), upload.single('image'), [
  body('titleAr').trim().notEmpty().withMessage('Arabic title is required'),
  body('titleEn').trim().notEmpty().withMessage('English title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }

    const { titleAr, titleEn, descriptionAr, descriptionEn, icon, link, order } = req.body;

    const slider = await prisma.slider.create({
      data: {
        image: `/uploads/sliders/${req.file.filename}`,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        icon,
        link,
        order: order ? parseInt(order) : 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      data: slider
    });
  } catch (error) {
    console.error('Create slider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create slider',
      error: error.message
    });
  }
});

// Update slider (Admin only)
router.put('/:id', authenticate, authorize('ADMIN'), upload.single('image'), [
  body('titleAr').optional().trim().notEmpty(),
  body('titleEn').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { titleAr, titleEn, descriptionAr, descriptionEn, icon, link, order, isActive } = req.body;

    const updateData = {};
    if (titleAr) updateData.titleAr = titleAr;
    if (titleEn) updateData.titleEn = titleEn;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (icon !== undefined) updateData.icon = icon;
    if (link !== undefined) updateData.link = link;
    if (order !== undefined) updateData.order = parseInt(order);
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (req.file) updateData.image = `/uploads/sliders/${req.file.filename}`;

    const slider = await prisma.slider.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Slider updated successfully',
      data: slider
    });
  } catch (error) {
    console.error('Update slider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update slider',
      error: error.message
    });
  }
});

// Delete slider (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.slider.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Slider deleted successfully'
    });
  } catch (error) {
    console.error('Delete slider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete slider',
      error: error.message
    });
  }
});

module.exports = router;

