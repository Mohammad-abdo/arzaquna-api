const express = require('express');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { ensureImagesArray, getImageUrl, getImageUrls } = require('../../utils/jsonHelper');

const router = express.Router();

// Add to favorites
router.post('/add', authenticate, [
  require('express-validator').body('productId').notEmpty().withMessage('Product ID is required')
], async (req, res) => {
  try {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { productId } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        productId
      },
      include: {
        product: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            price: true,
            images: true,
            vendor: {
              select: {
                storeName: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: favorite.id,
        product: {
          id: favorite.product.id,
          name_ar: favorite.product.nameAr,
          name_en: favorite.product.nameEn,
          price: favorite.product.price,
          image: getImageUrl(ensureImagesArray(favorite.product.images)[0] || null),
          vendor_name: favorite.product.vendor.storeName
        },
        created_at: favorite.createdAt
      }
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add favorite'
    });
  }
});

// Get user favorites
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              price: true,
              images: true,
              age: true,
              weight: true,
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
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.favorite.count({
        where: { userId: req.user.id }
      })
    ]);

    res.json({
      success: true,
      data: {
        favorites: favorites.map(fav => ({
          id: fav.id,
          product: {
            id: fav.product.id,
            name_ar: fav.product.nameAr,
            name_en: fav.product.nameEn,
            price: fav.product.price,
            images: getImageUrls(fav.product.images),
            age: fav.product.age,
            weight: fav.product.weight,
            category: {
              id: fav.product.category.id,
              name_ar: fav.product.category.nameAr,
              name_en: fav.product.category.nameEn
            },
            vendor: {
              id: fav.product.vendor.id,
              store_name: fav.product.vendor.storeName,
              owner_name: fav.product.vendor.user.fullName
            }
          },
          added_at: fav.createdAt
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
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites'
    });
  }
});

// Remove from favorites
router.delete('/:itemId', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;

    const favorite = await prisma.favorite.findFirst({
      where: {
        id: itemId,
        userId: req.user.id
      }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    await prisma.favorite.delete({
      where: { id: itemId }
    });

    res.json({
      success: true,
      message: 'Favorite removed successfully'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite'
    });
  }
});

module.exports = router;

