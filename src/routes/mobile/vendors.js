const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { optionalAuth, authenticate, isVendor } = require('../../middleware/auth');
const upload = require('../../utils/upload');
const { ensureImagesArray, getImageUrl, getImageUrls } = require('../../utils/jsonHelper');

const router = express.Router();

// Search vendors
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, city, region, categoryId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isApproved: true
    };

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId
        }
      };
    }
    if (q) {
      where.OR = [
        { storeName: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        select: {
          id: true,
          storeName: true,
          city: true,
          region: true,
          yearsOfExperience: true,
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  isActive: true,
                  isApproved: true
                }
              },
              statuses: {
                where: {
                  isActive: true
                }
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vendor.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        vendors: vendors.map(vendor => ({
          id: vendor.id,
          store_name: vendor.storeName,
          owner_name: vendor.user.fullName,
          city: vendor.city,
          region: vendor.region,
          years_experience: vendor.yearsOfExperience,
          phone: vendor.user.phone,
          products_count: vendor._count.products,
          offers_count: vendor._count.statuses
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
    console.error('Search vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search vendors'
    });
  }
});

// Get vendor products by category (CRITICAL: Only category-related products)
router.get('/:vendorId/category/:categoryId/products', optionalAuth, async (req, res) => {
  try {
    const { vendorId, categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify vendor exists and is approved
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        storeName: true,
        isApproved: true,
        categories: {
          where: { categoryId: categoryId },
          select: { categoryId: true }
        }
      }
    });

    if (!vendor || !vendor.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or not approved'
      });
    }

    // Verify vendor has this category
    if (vendor.categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor does not have products in this category'
      });
    }

    // Get ONLY products in this specific category
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          vendorId: vendorId,
          categoryId: categoryId,
          isActive: true,
          isApproved: true
        },
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
          createdAt: true,
          specifications: {
            select: {
              key: true,
              valueAr: true,
              valueEn: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({
        where: {
          vendorId: vendorId,
          categoryId: categoryId,
          isActive: true,
          isApproved: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          store_name: vendor.storeName
        },
        category_id: categoryId,
        products: products.map(product => ({
          id: product.id,
          name_ar: product.nameAr,
          name_en: product.nameEn,
          age: product.age,
          weight: product.weight,
          price: product.price,
          images: getImageUrls(product.images),
          description_ar: product.descriptionAr,
          description_en: product.descriptionEn,
          specifications: product.specifications.map(spec => ({
            key: spec.key,
            value_ar: spec.valueAr,
            value_en: spec.valueEn
          })),
          created_at: product.createdAt
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
    console.error('Get vendor category products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get vendor profile
router.get('/:vendorId/profile', optionalAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        storeName: true,
        city: true,
        region: true,
        yearsOfExperience: true,
        whatsappNumber: true,
        callNumber: true,
        isApproved: true,
        createdAt: true,
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
        },
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                isApproved: true
              }
            },
            statuses: {
              where: {
                isActive: true
              }
            }
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
      data: {
        id: vendor.id,
        store_name: vendor.storeName,
        owner: {
          id: vendor.user.id,
          full_name: vendor.user.fullName,
          email: vendor.user.email,
          phone: vendor.user.phone
        },
        location: {
          city: vendor.city,
          region: vendor.region
        },
        years_experience: vendor.yearsOfExperience,
        contact: {
          whatsapp: vendor.whatsappNumber,
          call: vendor.callNumber
        },
        categories: vendor.categories.map(vc => ({
          id: vc.category.id,
          name_ar: vc.category.nameAr,
          name_en: vc.category.nameEn
        })),
        stats: {
          products_count: vendor._count.products,
          offers_count: vendor._count.statuses
        },
        created_at: vendor.createdAt
      }
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor profile'
    });
  }
});

// Get vendor statuses/offers
router.get('/:vendorId/statuses', optionalAuth, async (req, res) => {
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

// Get vendor contact info
router.get('/:vendorId/contact-info', optionalAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        storeName: true,
        whatsappNumber: true,
        callNumber: true,
        isApproved: true,
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true
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
      data: {
        vendor_id: vendor.id,
        store_name: vendor.storeName,
        owner_name: vendor.user.fullName,
        contact: {
          whatsapp: vendor.whatsappNumber,
          call: vendor.callNumber,
          email: vendor.user.email,
          phone: vendor.user.phone
        }
      }
    });
  } catch (error) {
    console.error('Get vendor contact info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact info'
    });
  }
});

// Delete vendor account (vendor can delete their own account)
router.delete('/account', authenticate, isVendor, [
  body('password').notEmpty().withMessage('Password is required for account deletion')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { password } = req.body;

    // Get user with vendor profile
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        vendorProfile: {
          select: { id: true }
        }
      },
      select: {
        id: true,
        password: true,
        vendorProfile: {
          select: { id: true }
        }
      }
    });

    if (!user || !user.vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor account not found'
      });
    }

    // Verify password
    if (user.password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Account deletion requires password confirmation.'
        });
      }
    }

    // Delete vendor profile first (cascade will handle products, statuses, etc.)
    await prisma.vendor.delete({
      where: { id: user.vendorProfile.id }
    });

    // Update user role back to USER (don't delete user, just remove vendor status)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'USER' }
    });

    res.json({
      success: true,
      message: 'Vendor account deleted successfully. Your user account remains active.'
    });
  } catch (error) {
    console.error('Delete vendor account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor account',
      error: error.message
    });
  }
});

module.exports = router;

