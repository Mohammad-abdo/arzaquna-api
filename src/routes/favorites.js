const express = require('express');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user favorites
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        skip,
        take: parseInt(limit),
        include: {
          product: {
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
              category: true,
              specifications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.favorite.count({
        where: { userId: req.user.id }
      })
    ]);

    res.json({
      success: true,
      data: {
        favorites,
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
      message: 'Failed to fetch favorites',
      error: error.message
    });
  }
});

// Add to favorites
router.post('/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already favorited
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
          include: {
            category: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to favorites',
      error: error.message
    });
  }
});

// Remove from favorites
router.delete('/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    res.json({
      success: true,
      message: 'Product removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from favorites',
      error: error.message
    });
  }
});

// Check if product is favorited
router.get('/check/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    res.json({
      success: true,
      data: {
        isFavorited: !!favorite
      }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite',
      error: error.message
    });
  }
});

module.exports = router;

