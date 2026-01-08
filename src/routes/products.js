const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth, isVendor } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

// Get products
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, vendorId, categoryId, search, isApproved } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isActive: true
    };

    if (vendorId) where.vendorId = vendorId;
    if (categoryId) where.categoryId = categoryId;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true' || isApproved === true;
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } }
      ];
    }

    let products;
    try {
      products = await prisma.product.findMany({
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
          category: true,
          specifications: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      // If new columns don't exist, use select without them
      if (error.message && (error.message.includes('rating') || error.message.includes('isBestProduct'))) {
        products = await prisma.product.findMany({
          where,
          skip,
          take: parseInt(limit),
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            age: true,
            weight: true,
            price: true,
            images: true,
            descriptionAr: true,
            descriptionEn: true,
            isActive: true,
            isApproved: true,
            createdAt: true,
            updatedAt: true,
            vendor: {
              select: {
                id: true,
                storeName: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true
                  }
                }
              }
            },
            category: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true
              }
            },
            specifications: {
              select: {
                key: true,
                valueAr: true,
                valueEn: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        // Add default values for missing fields
        products = products.map(p => ({
          ...p,
          rating: null,
          isBestProduct: false
        }));
      } else {
        throw error;
      }
    }

    const total = await prisma.product.count({ where });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// Get product by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    let product;
    try {
      product = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          age: true,
          weight: true,
          price: true,
          rating: true,
          images: true,
          descriptionAr: true,
          descriptionEn: true,
          isActive: true,
          isApproved: true,
          isBestProduct: true,
          approvedAt: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              storeName: true,
              city: true,
              region: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true
                }
              },
              categories: {
                select: {
                  category: {
                    select: {
                      id: true,
                      nameAr: true,
                      nameEn: true
                    }
                  }
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true
            }
          },
          specifications: {
            select: {
              key: true,
              valueAr: true,
              valueEn: true
            }
          }
        }
      });
    } catch (error) {
      // If new columns don't exist, use select without them
      if (error.message && (error.message.includes('rating') || error.message.includes('isBestProduct'))) {
        product = await prisma.product.findUnique({
          where: { id },
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            age: true,
            weight: true,
            price: true,
            images: true,
            descriptionAr: true,
            descriptionEn: true,
            isActive: true,
            isApproved: true,
            approvedAt: true,
            createdAt: true,
            updatedAt: true,
            vendor: {
              select: {
                id: true,
                storeName: true,
                city: true,
                region: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true
                  }
                },
                categories: {
                  select: {
                    category: {
                      select: {
                        id: true,
                        nameAr: true,
                        nameEn: true
                      }
                    }
                  }
                }
              }
            },
            category: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true
              }
            },
            specifications: {
              select: {
                key: true,
                valueAr: true,
                valueEn: true
              }
            }
          }
        });
        // Add default values for missing fields
        if (product) {
          product = {
            ...product,
            rating: null,
            isBestProduct: false
          };
        }
      } else {
        throw error;
      }
    }

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// Create product (Vendor only)
router.post('/', authenticate, isVendor, upload.array('images', 10), [
  body('nameAr').trim().notEmpty().withMessage('Arabic name is required'),
  body('nameEn').trim().notEmpty().withMessage('English name is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
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

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id }
    });

    const { nameAr, nameEn, categoryId, age, weight, descriptionAr, descriptionEn, price, specifications } = req.body;

    // Verify vendor has this category
    const vendorCategory = await prisma.vendorCategory.findFirst({
      where: {
        vendorId: vendor.id,
        categoryId
      }
    });

    if (!vendorCategory) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to add products in this category'
      });
    }

    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId,
        nameAr,
        nameEn,
        age,
        weight,
        descriptionAr,
        descriptionEn,
        price: parseFloat(price),
        images: images, // Prisma will convert array to JSON
        isApproved: false // Requires admin approval
      },
      include: {
        category: true,
        vendor: {
          include: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    // Add specifications if provided
    if (specifications && Array.isArray(specifications)) {
      await Promise.all(
        specifications.map(spec =>
          prisma.productSpecification.create({
            data: {
              productId: product.id,
              key: spec.key,
              valueAr: spec.valueAr,
              valueEn: spec.valueEn
            }
          })
        )
      );
    }

    const productWithSpecs = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        specifications: true,
        category: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully. Waiting for admin approval.',
      data: productWithSpecs
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Update product (Vendor only - own products)
router.put('/:id', authenticate, isVendor, upload.array('images', 10), [
  body('nameAr').optional().trim().notEmpty(),
  body('nameEn').optional().trim().notEmpty(),
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

    // Check if product belongs to vendor
    const product = await prisma.product.findFirst({
      where: {
        id,
        vendorId: vendor.id
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it'
      });
    }

    const { nameAr, nameEn, age, weight, descriptionAr, descriptionEn, price } = req.body;
    const updateData = {};

    if (nameAr) updateData.nameAr = nameAr;
    if (nameEn) updateData.nameEn = nameEn;
    if (age !== undefined) updateData.age = age;
    if (weight !== undefined) updateData.weight = weight;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (price) updateData.price = parseFloat(price);
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => `/uploads/products/${file.filename}`); // Prisma converts to JSON
    }

    // Reset approval status if product is updated
    updateData.isApproved = false;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        specifications: true
      }
    });

    res.json({
      success: true,
      message: 'Product updated successfully. Waiting for admin approval.',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Delete product (Vendor - own products, Admin - all)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN') {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: req.user.id }
      });

      if (!vendor || product.vendorId !== vendor.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this product'
        });
      }
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

// Approve/Reject product (Admin only)
router.put('/:id/approve', authenticate, authorize('ADMIN'), [
  body('isApproved').isBoolean().withMessage('isApproved must be a boolean')
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
    const { isApproved } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        isApproved,
        approvedAt: isApproved ? new Date() : null
      },
      include: {
        vendor: {
          include: {
            user: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Product ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: product
    });
  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product approval',
      error: error.message
    });
  }
});

module.exports = router;

