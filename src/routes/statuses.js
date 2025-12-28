const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, optionalAuth, isVendor, authorize } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

// Get all statuses
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, vendorId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true };
    if (vendorId) where.vendorId = vendorId;

    const [statuses, total] = await Promise.all([
      prisma.status.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true
                }
              }
            }
          },
          product: {
            include: {
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.status.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        statuses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statuses',
      error: error.message
    });
  }
});

// Get status by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const status = await prisma.status.findUnique({
      where: { id },
      include: {
        vendor: {
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
            }
          }
        },
        product: {
          include: {
            category: true,
            specifications: true
          }
        }
      }
    });

    if (!status || !status.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status',
      error: error.message
    });
  }
});

// Create status (Vendor or Admin)
router.post('/', authenticate, upload.single('image'), [
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
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

    // Check if user is vendor or admin
    let vendorId;
    if (req.user.role === 'ADMIN') {
      // Admin can specify vendorId or create status without vendor
      const { vendorId: adminVendorId, price, icon, titleAr, titleEn, descriptionAr, descriptionEn } = req.body;
      if (!adminVendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required for admin'
        });
      }
      vendorId = adminVendorId;
    } else if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: req.user.id }
      });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }
      vendorId = vendor.id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only vendors and admins can create statuses'
      });
    }

    const { productId, price, icon, titleAr, titleEn, descriptionAr, descriptionEn } = req.body;

    const status = await prisma.status.create({
      data: {
        vendorId: vendorId,
        productId: productId || null,
        image: `/uploads/statuses/${req.file.filename}`,
        price: parseFloat(price),
        icon,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn
      },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true
              }
            }
          }
        },
        product: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Status published successfully',
      data: status
    });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create status',
      error: error.message
    });
  }
});

// Update status (Vendor only - own statuses)
router.put('/:id', authenticate, isVendor, upload.single('image'), [
  body('price').optional().isFloat({ min: 0 })
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
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    // Check if status belongs to vendor
    const status = await prisma.status.findFirst({
      where: {
        id,
        vendorId: vendor.id
      }
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found or you do not have permission to update it'
      });
    }

    const { productId, price, icon, titleAr, titleEn, descriptionAr, descriptionEn } = req.body;
    const updateData = {};

    if (productId !== undefined) updateData.productId = productId || null;
    if (price) updateData.price = parseFloat(price);
    if (icon !== undefined) updateData.icon = icon;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (titleEn !== undefined) updateData.titleEn = titleEn;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (req.file) updateData.image = `/uploads/statuses/${req.file.filename}`;

    const updatedStatus = await prisma.status.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          include: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        },
        product: true
      }
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: updatedStatus
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Delete status (Vendor - own statuses, Admin - all)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const status = await prisma.status.findUnique({
      where: { id }
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN') {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: req.user.id }
      });

      if (!vendor || status.vendorId !== vendor.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this status'
        });
      }
    }

    await prisma.status.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Status deleted successfully'
    });
  } catch (error) {
    console.error('Delete status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete status',
      error: error.message
    });
  }
});

module.exports = router;

