const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true' || isRead === true;

    // Check notification settings
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
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
          }
        });
      }
      if (type === 'OFFER' && !settings.offerEnabled) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
          }
        });
      }
      if (type === 'MESSAGE' && !settings.messageEnabled) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
          }
        });
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          titleAr: true,
          titleEn: true,
          messageAr: true,
          messageEn: true,
          data: true,
          isRead: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notifications: notifications.map(notif => ({
          id: notif.id,
          type: notif.type,
          title_ar: notif.titleAr,
          title_en: notif.titleEn,
          message_ar: notif.messageAr,
          message_en: notif.messageEn,
          data: notif.data ? JSON.parse(notif.data) : null,
          is_read: notif.isRead,
          created_at: notif.createdAt
        })),
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
      message: 'Failed to fetch notifications'
    });
  }
});

// Get/Update notification settings
router.post('/settings', authenticate, [
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

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId: req.user.id,
          orderEnabled: orderEnabled !== undefined ? orderEnabled : true,
          offerEnabled: offerEnabled !== undefined ? offerEnabled : true,
          messageEnabled: messageEnabled !== undefined ? messageEnabled : true
        }
      });
    } else {
      const updateData = {};
      if (orderEnabled !== undefined) updateData.orderEnabled = orderEnabled;
      if (offerEnabled !== undefined) updateData.offerEnabled = offerEnabled;
      if (messageEnabled !== undefined) updateData.messageEnabled = messageEnabled;

      settings = await prisma.notificationSettings.update({
        where: { userId: req.user.id },
        data: updateData
      });
    }

    res.json({
      success: true,
      data: {
        order_enabled: settings.orderEnabled,
        offer_enabled: settings.offerEnabled,
        message_enabled: settings.messageEnabled
      }
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Mark notification as read
router.patch('/read/:notificationId', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
});

module.exports = router;



