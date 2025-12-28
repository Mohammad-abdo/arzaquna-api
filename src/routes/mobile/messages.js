const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Get user chats (conversations list)
router.get('/chats', authenticate, async (req, res) => {
  try {
    // Get all unique conversations
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        subject: true,
        contentAr: true,
        contentEn: true,
        type: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by conversation partner
    const chatsMap = new Map();
    messages.forEach(msg => {
      const partnerId = msg.senderId === req.user.id ? msg.receiverId : msg.senderId;
      const partner = msg.senderId === req.user.id ? msg.receiver : msg.sender;

      if (!chatsMap.has(partnerId)) {
        chatsMap.set(partnerId, {
          partner: {
            id: partner.id,
            full_name: partner.fullName,
            role: partner.role
          },
          last_message: {
            id: msg.id,
            content_ar: msg.contentAr,
            content_en: msg.contentEn,
            type: msg.type,
            is_read: msg.receiverId === req.user.id ? msg.isRead : true,
            created_at: msg.createdAt
          },
          unread_count: 0
        });
      }

      const chat = chatsMap.get(partnerId);
      if (msg.receiverId === req.user.id && !msg.isRead) {
        chat.unread_count++;
      }
    });

    const chats = Array.from(chatsMap.values());

    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats'
    });
  }
});

// Get messages in a chat
router.get('/chats/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // chatId is the other user's ID
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: req.user.id,
            receiverId: chatId
          },
          {
            senderId: chatId,
            receiverId: req.user.id
          }
        ]
      },
      select: {
        id: true,
        senderId: true,
        subject: true,
        contentAr: true,
        contentEn: true,
        type: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        receiverId: req.user.id,
        senderId: chatId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg.id,
          sender_id: msg.senderId,
          sender_name: msg.sender.fullName,
          sender_role: msg.sender.role,
          is_me: msg.senderId === req.user.id,
          subject: msg.subject,
          content_ar: msg.contentAr,
          content_en: msg.contentEn,
          type: msg.type,
          is_read: msg.isRead,
          created_at: msg.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: messages.length,
          has_more: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Send message in chat
router.post('/chats/:chatId/messages', authenticate, [
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

    const { chatId } = req.params;
    const { subject, contentAr, contentEn, type } = req.body;

    const receiver = await prisma.user.findUnique({
      where: { id: chatId }
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId: chatId,
        subject,
        contentAr,
        contentEn,
        type: type || 'GENERAL'
      },
      select: {
        id: true,
        contentAr: true,
        contentEn: true,
        type: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        content_ar: message.contentAr,
        content_en: message.contentEn,
        type: message.type,
        created_at: message.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Create support ticket
router.post('/support/ticket', authenticate, [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('contentAr').trim().notEmpty().withMessage('Arabic content is required'),
  body('contentEn').trim().notEmpty().withMessage('English content is required'),
  body('type').isIn(['SUPPORT', 'COMPLAINT', 'INQUIRY']).withMessage('Invalid ticket type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { subject, contentAr, contentEn, type } = req.body;

    // Find an admin to send the ticket to
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true }
    });

    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'No admin available to receive support ticket'
      });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId: admin.id,
        subject,
        contentAr,
        contentEn,
        type
      },
      select: {
        id: true,
        subject: true,
        type: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ticket_id: message.id,
        subject: message.subject,
        type: message.type,
        created_at: message.createdAt
      }
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
});

module.exports = router;



