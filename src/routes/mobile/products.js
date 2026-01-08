const express = require('express');
const prisma = require('../../config/database');
const { optionalAuth } = require('../../middleware/auth');
const { ensureImagesArray, getImageUrls } = require('../../utils/jsonHelper');

const router = express.Router();

// Get best products (featured products)
router.get('/best', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isBestProduct: true,
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
          rating: true,
          images: true,
          descriptionAr: true,
          descriptionEn: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true
            }
          },
          vendor: {
            select: {
              id: true,
              storeName: true,
              city: true,
              region: true,
              user: {
                select: {
                  fullName: true,
                  phone: true
                }
              }
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
        skip,
        take: parseInt(limit),
        orderBy: [
          { rating: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.product.count({
        where: {
          isBestProduct: true,
          isActive: true,
          isApproved: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        products: products.map(product => ({
          id: product.id,
          name_ar: product.nameAr,
          name_en: product.nameEn,
          age: product.age,
          weight: product.weight,
          price: product.price,
          rating: product.rating || 0,
          images: getImageUrls(product.images),
          description_ar: product.descriptionAr,
          description_en: product.descriptionEn,
          location: {
            city: product.vendor.city,
            region: product.vendor.region
          },
          category: {
            id: product.category.id,
            name_ar: product.category.nameAr,
            name_en: product.category.nameEn
          },
          vendor: {
            id: product.vendor.id,
            store_name: product.vendor.storeName,
            owner_name: product.vendor.user.fullName,
            phone: product.vendor.user.phone
          },
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
    console.error('Get best products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch best products'
    });
  }
});

// Search products
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, categoryId, vendorId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isActive: true,
      isApproved: true
    };

    if (categoryId) where.categoryId = categoryId;
    if (vendorId) where.vendorId = vendorId;
    if (q) {
      where.OR = [
        { nameAr: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { descriptionAr: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
          category: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true
            }
          },
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
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      data: {
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
          category: {
            id: product.category.id,
            name_ar: product.category.nameAr,
            name_en: product.category.nameEn
          },
          vendor: {
            id: product.vendor.id,
            store_name: product.vendor.storeName,
            owner_name: product.vendor.user.fullName
          },
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
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
});

// Get product details
router.get('/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
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
        createdAt: true,
        specifications: {
          select: {
            key: true,
            valueAr: true,
            valueEn: true
          }
        },
        category: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true
          }
        },
        vendor: {
          select: {
            id: true,
            storeName: true,
            city: true,
            region: true,
            user: {
              select: {
                fullName: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!product || !product.isActive || !product.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: product.id,
        name_ar: product.nameAr,
        name_en: product.nameEn,
        age: product.age,
        weight: product.weight,
        price: product.price,
        rating: product.rating || 0,
        images: getImageUrls(product.images),
        description_ar: product.descriptionAr,
        description_en: product.descriptionEn,
        location: {
          city: product.vendor.city,
          region: product.vendor.region
        },
        category: {
          id: product.category.id,
          name_ar: product.category.nameAr,
          name_en: product.category.nameEn
        },
        vendor: {
          id: product.vendor.id,
          store_name: product.vendor.storeName,
          owner_name: product.vendor.user.fullName,
          phone: product.vendor.user.phone
        },
        specifications: product.specifications.map(spec => ({
          key: spec.key,
          value_ar: spec.valueAr,
          value_en: spec.valueEn
        })),
        created_at: product.createdAt
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Get product specifications
router.get('/:productId/specifications', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
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

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product_id: productId,
        category: {
          id: product.category.id,
          name_ar: product.category.nameAr,
          name_en: product.category.nameEn
        },
        specifications: product.specifications.map(spec => ({
          key: spec.key,
          value_ar: spec.valueAr,
          value_en: spec.valueEn
        }))
      }
    });
  } catch (error) {
    console.error('Get product specifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specifications'
    });
  }
});

// Get product gallery
router.get('/:productId/gallery', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        images: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product_id: productId,
        product_name_ar: product.nameAr,
        product_name_en: product.nameEn,
        images: getImageUrls(product.images)
      }
    });
  } catch (error) {
    console.error('Get product gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery'
    });
  }
});

module.exports = router;

