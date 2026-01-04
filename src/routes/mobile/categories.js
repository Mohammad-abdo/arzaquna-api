const express = require('express');
const prisma = require('../../config/database');
const { optionalAuth } = require('../../middleware/auth');
const { getImageUrl } = require('../../utils/jsonHelper');

const router = express.Router();

// Get all categories
router.get('/', optionalAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        icon: true,
        image: true,
        _count: {
          select: {
            vendors: true
          }
        }
      },
      orderBy: { nameEn: 'asc' }
    });

    res.json({
      success: true,
      data: categories.map(cat => ({
        id: cat.id,
        name_ar: cat.nameAr,
        name_en: cat.nameEn,
        icon: cat.icon,
        image: getImageUrl(cat.image),
        vendor_count: cat._count.vendors
      }))
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get vendors in a specific category (with pagination) - Must be before /:id route
router.get('/:categoryId/vendors', optionalAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, nameAr: true, nameEn: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where: {
          isApproved: true,
          categories: {
            some: {
              categoryId: categoryId
            }
          }
        },
        select: {
          id: true,
          storeName: true,
          city: true,
          region: true,
          yearsOfExperience: true,
          user: {
            select: {
              fullName: true,
              phone: true
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  categoryId: categoryId,
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
      prisma.vendor.count({
        where: {
          isApproved: true,
          categories: {
            some: {
              categoryId: categoryId
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name_ar: category.nameAr,
          name_en: category.nameEn
        },
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
    console.error('Get category vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors'
    });
  }
});

// Get single category with all vendors
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get category with all vendors
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        icon: true,
        image: true,
        isActive: true
      }
    });

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get all vendors in this category
    const vendors = await prisma.vendor.findMany({
      where: {
        isApproved: true,
        categories: {
          some: {
            categoryId: id
          }
        }
      },
      select: {
        id: true,
        storeName: true,
        city: true,
        region: true,
        yearsOfExperience: true,
        whatsappNumber: true,
        callNumber: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        _count: {
          select: {
            products: {
              where: {
                categoryId: id,
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
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        id: category.id,
        name_ar: category.nameAr,
        name_en: category.nameEn,
        icon: category.icon,
        image: getImageUrl(category.image),
        vendors: vendors.map(vendor => ({
          id: vendor.id,
          store_name: vendor.storeName,
          owner: {
            id: vendor.user.id,
            full_name: vendor.user.fullName,
            phone: vendor.user.phone,
            email: vendor.user.email
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
          stats: {
            products_count: vendor._count.products,
            offers_count: vendor._count.statuses
          },
          created_at: vendor.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
});

module.exports = router;



