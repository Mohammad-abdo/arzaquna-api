const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (isRead !== undefined) where.isRead = isRead === 'true' || isRead === true;
    if (type) where.type = type;

    // Get notification settings
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.id }
    });

    // Filter by user settings
    if (settings) {
      if (type === 'ORDER' && !settings.orderEnabled) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0
            }
          }
        });
      }
      if (type === 'OFFER' && !settings.offerEnabled) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0
            }
          }
        });
      }
      if (type === 'MESSAGE' && !settings.messageEnabled) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0
            }
          }
        });
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: updated
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications',
      error: error.message
    });
  }
});

// Get notification settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId: req.user.id }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings',
      error: error.message
    });
  }
});

// Update notification settings
router.put('/settings', authenticate, [
  body('orderEnabled').optional().isBoolean(),
  body('offerEnabled').optional().isBoolean(),
  body('messageEnabled').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { orderEnabled, offerEnabled, messageEnabled } = req.body;

    const updateData = {};
    if (orderEnabled !== undefined) updateData.orderEnabled = orderEnabled;
    if (offerEnabled !== undefined) updateData.offerEnabled = offerEnabled;
    if (messageEnabled !== undefined) updateData.messageEnabled = messageEnabled;

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId: req.user.id,
          ...updateData
        }
      });
    } else {
      settings = await prisma.notificationSettings.update({
        where: { userId: req.user.id },
        data: updateData
      });
    }

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
});

// Create notification (Admin/Vendor/System)
router.post('/', authenticate, authorize('ADMIN', 'VENDOR'), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('type').isIn(['ORDER', 'OFFER', 'MESSAGE']).withMessage('Invalid notification type'),
  body('titleAr').trim().notEmpty().withMessage('Arabic title is required'),
  body('titleEn').trim().notEmpty().withMessage('English title is required'),
  body('messageAr').trim().notEmpty().withMessage('Arabic message is required'),
  body('messageEn').trim().notEmpty().withMessage('English message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId, type, titleAr, titleEn, messageAr, messageEn, data } = req.body;

    // Check notification settings
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId }
    });

    if (settings) {
      if (type === 'ORDER' && !settings.orderEnabled) {
        return res.status(400).json({
          success: false,
          message: 'User has disabled order notifications'
        });
      }
      if (type === 'OFFER' && !settings.offerEnabled) {
        return res.status(400).json({
          success: false,
          message: 'User has disabled offer notifications'
        });
      }
      if (type === 'MESSAGE' && !settings.messageEnabled) {
        return res.status(400).json({
          success: false,
          message: 'User has disabled message notifications'
        });
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        titleAr,
        titleEn,
        messageAr,
        messageEn,
        data: data ? JSON.stringify(data) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

module.exports = router;

