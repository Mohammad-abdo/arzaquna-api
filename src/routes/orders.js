const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get user orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user.id },
          ...(req.user.role === 'VENDOR' ? [{ vendor: { userId: req.user.id } }] : []),
          ...(req.user.role === 'ADMIN' ? [{}] : [])
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                specifications: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// Create order
router.post('/', authenticate, [
  body('vendorId').notEmpty().withMessage('Vendor ID is required'),
  body('items').isArray().notEmpty().withMessage('Order items are required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { vendorId, items, notes } = req.body;

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor || !vendor.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or not approved'
      });
    }

    // Verify products and calculate total
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product || !product.isActive || !product.isApproved) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found or not available`
        });
      }

      if (product.vendorId !== vendorId) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} does not belong to this vendor`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalPrice += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        vendorId,
        notes,
        items: {
          create: orderItems
        }
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
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Update order status
router.put('/:id/status', authenticate, [
  body('status').isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
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
    const { status } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'ADMIN' ||
      (req.user.role === 'VENDOR' && order.vendor.userId === req.user.id) ||
      (req.user.role === 'USER' && order.userId === req.user.id && status === 'CANCELLED');

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this order'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true
          }
        },
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
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

module.exports = router;

