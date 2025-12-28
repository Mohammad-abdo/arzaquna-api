const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

// Get all categories
router.get('/', optionalAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            vendors: true,
            products: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get category by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        vendors: {
          include: {
            vendor: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true
                  }
                },
                _count: {
                  select: {
                    products: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Only check isActive for non-authenticated users or non-admins
    // Admins should be able to see inactive categories for editing
    if (!req.user || req.user.role !== 'ADMIN') {
      if (!category.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

// Create category (Admin only)
router.post('/', authenticate, authorize('ADMIN'), upload.single('image'), [
  body('nameAr').trim().notEmpty().withMessage('Arabic name is required'),
  body('nameEn').trim().notEmpty().withMessage('English name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { nameAr, nameEn, icon } = req.body;
    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const category = await prisma.category.create({
      data: {
        nameAr,
        nameEn,
        icon,
        image
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// Update category (Admin only)
router.put('/:id', authenticate, authorize('ADMIN'), upload.single('image'), [
  body('nameAr').optional().trim().notEmpty(),
  body('nameEn').optional().trim().notEmpty()
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
    const { nameAr, nameEn, icon, isActive } = req.body;

    const updateData = {};
    if (nameAr) updateData.nameAr = nameAr;
    if (nameEn) updateData.nameEn = nameEn;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (req.file) updateData.image = `/uploads/categories/${req.file.filename}`;

    const category = await prisma.category.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// Delete category (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.category.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

module.exports = router;

