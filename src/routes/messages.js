const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get user messages
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      OR: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ]
    };

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true' || isRead === true;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true
            }
          },
          receiver: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Get conversation with specific user
router.get('/conversation/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: req.user.id,
            receiverId: userId
          },
          {
            senderId: userId,
            receiverId: req.user.id
          }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        receiverId: req.user.id,
        senderId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message
    });
  }
});

// Send message
router.post('/', authenticate, [
  body('receiverId').notEmpty().withMessage('Receiver ID is required'),
  body('contentAr').trim().notEmpty().withMessage('Arabic content is required'),
  body('contentEn').trim().notEmpty().withMessage('English content is required'),
  body('type').optional().isIn(['SUPPORT', 'COMPLAINT', 'INQUIRY', 'GENERAL'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { receiverId, subject, contentAr, contentEn, type } = req.body;

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Check permissions based on roles
    if (req.user.role === 'USER') {
      // Users can message vendors and admins
      if (receiver.role !== 'VENDOR' && receiver.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You can only message vendors and admins'
        });
      }
    } else if (req.user.role === 'VENDOR') {
      // Vendors can message users and admins
      if (receiver.role !== 'USER' && receiver.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You can only message users and admins'
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId,
        subject,
        contentAr,
        contentEn,
        type: type || 'GENERAL'
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    });

    // Create notification
    try {
      const settings = await prisma.notificationSettings.findUnique({
        where: { userId: receiverId }
      });

      if (!settings || settings.messageEnabled) {
        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'MESSAGE',
            titleAr: 'رسالة جديدة',
            titleEn: 'New Message',
            messageAr: `لديك رسالة جديدة من ${req.user.fullName}`,
            messageEn: `You have a new message from ${req.user.fullName}`,
            data: JSON.stringify({ messageId: message.id })
          }
        });
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Mark message as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findFirst({
      where: {
        id,
        receiverId: req.user.id
      }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Message marked as read',
      data: updated
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: error.message
    });
  }
});

// Get unread count
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.user.id,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

module.exports = router;

