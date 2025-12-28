const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth, isVendor } = require('../middleware/auth');

const router = express.Router();

// Apply to become a vendor
router.post('/apply', authenticate, [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('specialization').isArray().notEmpty().withMessage('Specialization categories are required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('region').trim().notEmpty().withMessage('Region is required'),
  body('yearsOfExperience').isInt({ min: 0 }).withMessage('Years of experience must be a valid number'),
  body('whatsappNumber').trim().notEmpty().withMessage('WhatsApp number is required'),
  body('callNumber').trim().notEmpty().withMessage('Call number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      fullName,
      phone,
      email,
      storeName,
      specialization, // Array of category IDs
      city,
      region,
      yearsOfExperience,
      whatsappNumber,
      callNumber
    } = req.body;

    // Ensure specialization is an array
    const specializationArray = Array.isArray(specialization) ? specialization : [];

    // Check if user already has a pending or approved application
    const existingApplication = await prisma.vendorApplication.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved vendor application'
      });
    }

    // Check if user is already a vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'You are already a vendor'
      });
    }

    const application = await prisma.vendorApplication.create({
      data: {
        userId: req.user.id,
        fullName,
        phone,
        email,
        storeName,
        specialization: specializationArray, // Prisma will convert array to JSON
        city,
        region,
        yearsOfExperience: parseInt(yearsOfExperience),
        whatsappNumber,
        callNumber
      }
    });

    res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully. It will be reviewed within 24 hours.',
      data: application
    });
  } catch (error) {
    console.error('Vendor application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
});

// Get vendor applications (Admin only)
router.get('/applications', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      prisma.vendorApplication.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vendorApplication.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
});

// Review vendor application (Admin only)
router.put('/applications/:id/review', authenticate, authorize('ADMIN'), [
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Status must be APPROVED or REJECTED'),
  body('rejectionReason').optional().trim()
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
    const { status, rejectionReason } = req.body;

    const application = await prisma.vendorApplication.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Application has already been reviewed'
      });
    }

    // Update application
    const updatedApplication = await prisma.vendorApplication.update({
      where: { id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
      }
    });

    // If approved, create vendor profile
    if (status === 'APPROVED') {
      await prisma.vendor.create({
        data: {
          userId: application.userId,
        storeName: application.storeName,
        specialization: Array.isArray(application.specialization) 
          ? application.specialization 
          : JSON.parse(application.specialization || '[]'),
          city: application.city,
          region: application.region,
          yearsOfExperience: application.yearsOfExperience,
          whatsappNumber: application.whatsappNumber,
          callNumber: application.callNumber,
          isApproved: true,
          approvedAt: new Date()
        }
      });

      // Update user role
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: 'VENDOR' }
      });

      // Get the created vendor to use its ID
      const createdVendor = await prisma.vendor.findUnique({
        where: { userId: application.userId }
      });

      // Create vendor categories
      // specialization is stored as JSON, Prisma auto-parses it
      const specializationArray = Array.isArray(application.specialization) 
        ? application.specialization 
        : JSON.parse(application.specialization || '[]');
      
      for (const categoryId of specializationArray) {
        await prisma.vendorCategory.create({
          data: {
            vendorId: createdVendor.id,
            categoryId
          }
        });
      }
    }

    res.json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`,
      data: updatedApplication
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review application',
      error: error.message
    });
  }
});

// Get all vendors
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, categoryId, city, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isApproved: true
    };

    if (categoryId) {
      where.categories = {
        some: {
          categoryId
        }
      };
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (search) {
      where.storeName = { contains: search, mode: 'insensitive' };
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          categories: {
            include: {
              category: true
            }
          },
          _count: {
            select: {
              products: true,
              statuses: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vendor.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        vendors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message
    });
  }
});

// Get vendor by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        _count: {
          select: {
            products: true,
            statuses: true,
            orders: true
          }
        }
      }
    });

    if (!vendor || !vendor.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message
    });
  }
});

// Get vendor profile (Vendor only)
router.get('/profile/me', authenticate, isVendor, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        _count: {
          select: {
            products: true,
            statuses: true,
            orders: true
          }
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor profile',
      error: error.message
    });
  }
});

// Update vendor profile (Vendor only)
router.put('/profile/me', authenticate, isVendor, [
  body('storeName').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('region').optional().trim().notEmpty(),
  body('whatsappNumber').optional().trim().notEmpty(),
  body('callNumber').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { storeName, city, region, whatsappNumber, callNumber } = req.body;
    const updateData = {};

    if (storeName) updateData.storeName = storeName;
    if (city) updateData.city = city;
    if (region) updateData.region = region;
    if (whatsappNumber) updateData.whatsappNumber = whatsappNumber;
    if (callNumber) updateData.callNumber = callNumber;

    const vendor = await prisma.vendor.update({
      where: { userId: req.user.id },
      data: updateData,
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Vendor profile updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor profile',
      error: error.message
    });
  }
});

module.exports = router;

