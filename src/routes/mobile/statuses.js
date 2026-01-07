const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { optionalAuth, authenticate, isVendor } = require('../../middleware/auth');
const upload = require('../../utils/upload');
const { getImageUrl } = require('../../utils/jsonHelper');

const router = express.Router();

// Get latest statuses/offers
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [statuses, total] = await Promise.all([
      prisma.status.findMany({
        where: { isActive: true },
        select: {
          id: true,
          image: true,
          price: true,
          icon: true,
          titleAr: true,
          titleEn: true,
          descriptionAr: true,
          descriptionEn: true,
          productId: true,
          createdAt: true,
          vendor: {
            select: {
              id: true,
              storeName: true,
              user: {
                select: {
                  fullName: true
                }
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.status.count({
        where: { isActive: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        statuses: statuses.map(status => ({
          id: status.id,
          image: getImageUrl(status.image),
          price: status.price,
          icon: status.icon,
          title_ar: status.titleAr,
          title_en: status.titleEn,
          description_ar: status.descriptionAr,
          description_en: status.descriptionEn,
          product_id: status.productId,
          vendor: {
            id: status.vendor.id,
            store_name: status.vendor.storeName,
            owner_name: status.vendor.user.fullName
          },
          created_at: status.createdAt
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
    console.error('Get latest statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statuses'
    });
  }
});

// Get statuses by vendor
router.get('/by-vendor/:vendorId', optionalAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [statuses, total] = await Promise.all([
      prisma.status.findMany({
        where: {
          vendorId: vendorId,
          isActive: true
        },
        select: {
          id: true,
          image: true,
          price: true,
          icon: true,
          titleAr: true,
          titleEn: true,
          descriptionAr: true,
          descriptionEn: true,
          productId: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.status.count({
        where: {
          vendorId: vendorId,
          isActive: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        vendor_id: vendorId,
        statuses: statuses.map(status => ({
          id: status.id,
          image: getImageUrl(status.image),
          price: status.price,
          icon: status.icon,
          title_ar: status.titleAr,
          title_en: status.titleEn,
          description_ar: status.descriptionAr,
          description_en: status.descriptionEn,
          product_id: status.productId,
          created_at: status.createdAt
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
    console.error('Get vendor statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor statuses'
    });
  }
});

// Create status (Vendor only)
router.post('/vendor/statuses', authenticate, isVendor, upload.single('image'), [
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

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    const { productId, price, icon, titleAr, titleEn, descriptionAr, descriptionEn } = req.body;

    const status = await prisma.status.create({
      data: {
        vendorId: vendor.id,
        productId: productId || null,
        image: `/uploads/statuses/${req.file.filename}`,
        price: parseFloat(price),
        icon,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn
      },
      select: {
        id: true,
        image: true,
        price: true,
        icon: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        productId: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: status.id,
        image: getImageUrl(status.image),
        price: status.price,
        icon: status.icon,
        title_ar: status.titleAr,
        title_en: status.titleEn,
        description_ar: status.descriptionAr,
        description_en: status.descriptionEn,
        product_id: status.productId,
        created_at: status.createdAt
      }
    });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create status'
    });
  }
});

// Update status (Vendor only)
router.put('/vendor/statuses/:statusId', authenticate, isVendor, upload.single('image'), [
  body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { statusId } = req.params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    const status = await prisma.status.findFirst({
      where: {
        id: statusId,
        vendorId: vendor.id
      }
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found or you do not have permission'
      });
    }

    const { productId, price, icon, titleAr, titleEn, descriptionAr, descriptionEn } = req.body;
    const updateData = {};

    if (price !== undefined) updateData.price = parseFloat(price);
    if (productId !== undefined) updateData.productId = productId || null;
    if (icon !== undefined) updateData.icon = icon;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (titleEn !== undefined) updateData.titleEn = titleEn;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;

    // Handle image update
    if (req.file) {
      updateData.image = `/uploads/statuses/${req.file.filename}`;
    }

    const updatedStatus = await prisma.status.update({
      where: { id: statusId },
      data: updateData,
      select: {
        id: true,
        image: true,
        price: true,
        icon: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        productId: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        id: updatedStatus.id,
        image: getImageUrl(updatedStatus.image),
        price: updatedStatus.price,
        icon: updatedStatus.icon,
        title_ar: updatedStatus.titleAr,
        title_en: updatedStatus.titleEn,
        description_ar: updatedStatus.descriptionAr,
        description_en: updatedStatus.descriptionEn,
        product_id: updatedStatus.productId,
        updated_at: updatedStatus.updatedAt
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});

// Delete status (Vendor only)
router.delete('/vendor/statuses/:statusId', authenticate, isVendor, async (req, res) => {
  try {
    const { statusId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    const status = await prisma.status.findFirst({
      where: {
        id: statusId,
        vendorId: vendor.id
      }
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found or you do not have permission'
      });
    }

    await prisma.status.update({
      where: { id: statusId },
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
      message: 'Failed to delete status'
    });
  }
});

module.exports = router;



