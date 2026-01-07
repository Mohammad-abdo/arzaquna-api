const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { generateToken } = require('../../utils/jwt');
const { authenticate, optionalAuth } = require('../../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { fullName, phone, email, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        email,
        password: hashedPassword,
        role: 'USER'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImage: true,
        role: true
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        vendorProfile: {
          select: {
            id: true,
            storeName: true,
            isApproved: true
          }
        }
      }
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role,
          isVendor: !!user.vendorProfile,
          vendorApproved: user.vendorProfile?.isApproved || false
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Google Login (OAuth placeholder)
router.post('/login/google', [
  body('token').notEmpty().withMessage('Google token is required')
], async (req, res) => {
  try {
    // TODO: Implement Google OAuth verification
    res.status(501).json({
      success: false,
      message: 'Google OAuth not implemented yet'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Google login failed'
    });
  }
});

// Apple Login (OAuth placeholder)
router.post('/login/apple', [
  body('token').notEmpty().withMessage('Apple token is required')
], async (req, res) => {
  try {
    // TODO: Implement Apple OAuth verification
    res.status(501).json({
      success: false,
      message: 'Apple OAuth not implemented yet'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Apple login failed'
    });
  }
});

// Guest Mode
router.post('/guest', async (req, res) => {
  try {
    // Create a guest user or return guest token
    const guestToken = generateToken('guest');
    
    res.json({
      success: true,
      data: {
        token: guestToken,
        isGuest: true
      }
    });
  } catch (error) {
    console.error('Guest mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Guest mode failed'
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In JWT, logout is handled client-side by removing token
    // But we can log the action or invalidate token in future
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;



