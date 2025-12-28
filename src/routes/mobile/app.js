const express = require('express');
const prisma = require('../../config/database');
const { optionalAuth } = require('../../middleware/auth');

const router = express.Router();

// Get About App content
router.get('/about', optionalAuth, async (req, res) => {
  try {
    const content = await prisma.appContent.findUnique({
      where: { type: 'ABOUT' },
      select: {
        contentAr: true,
        contentEn: true,
        updatedAt: true
      }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: {
        content_ar: content.contentAr,
        content_en: content.contentEn,
        updated_at: content.updatedAt
      }
    });
  } catch (error) {
    console.error('Get about content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content'
    });
  }
});

// Get Privacy Policy
router.get('/privacy', optionalAuth, async (req, res) => {
  try {
    const content = await prisma.appContent.findUnique({
      where: { type: 'PRIVACY_POLICY' },
      select: {
        contentAr: true,
        contentEn: true,
        updatedAt: true
      }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: {
        content_ar: content.contentAr,
        content_en: content.contentEn,
        updated_at: content.updatedAt
      }
    });
  } catch (error) {
    console.error('Get privacy policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content'
    });
  }
});

// Get Terms & Conditions
router.get('/terms', optionalAuth, async (req, res) => {
  try {
    const content = await prisma.appContent.findUnique({
      where: { type: 'TERMS_CONDITIONS' },
      select: {
        contentAr: true,
        contentEn: true,
        updatedAt: true
      }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: {
        content_ar: content.contentAr,
        content_en: content.contentEn,
        updated_at: content.updatedAt
      }
    });
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content'
    });
  }
});

module.exports = router;



