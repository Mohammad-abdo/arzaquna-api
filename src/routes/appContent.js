const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get app content (public)
router.get('/:type', optionalAuth, async (req, res) => {
  try {
    const { type } = req.params;

    if (!['ABOUT', 'PRIVACY_POLICY', 'TERMS_CONDITIONS'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    const content = await prisma.appContent.findUnique({
      where: { type }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get app content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message
    });
  }
});

// Update app content (Admin only)
router.put('/:type', authenticate, authorize('ADMIN'), [
  body('contentAr').trim().notEmpty().withMessage('Arabic content is required'),
  body('contentEn').trim().notEmpty().withMessage('English content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { type } = req.params;
    const { contentAr, contentEn } = req.body;

    if (!['ABOUT', 'PRIVACY_POLICY', 'TERMS_CONDITIONS'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    let content = await prisma.appContent.findUnique({
      where: { type }
    });

    if (content) {
      content = await prisma.appContent.update({
        where: { type },
        data: {
          contentAr,
          contentEn,
          updatedBy: req.user.id
        }
      });
    } else {
      content = await prisma.appContent.create({
        data: {
          type,
          contentAr,
          contentEn,
          updatedBy: req.user.id
        }
      });
    }

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: content
    });
  } catch (error) {
    console.error('Update app content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update content',
      error: error.message
    });
  }
});

// Get all app content (Admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const contents = await prisma.appContent.findMany({
      orderBy: { type: 'asc' }
    });

    res.json({
      success: true,
      data: contents
    });
  } catch (error) {
    console.error('Get all app content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message
    });
  }
});

module.exports = router;

