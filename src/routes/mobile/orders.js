const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { ensureImagesArray } = require('../../utils/jsonHelper');

const router = express.Router();

// Get user orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              storeName: true,
              user: {
                select: {
                  fullName: true,
                  phone: true
                }
              }
            }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  nameAr: true,
                  nameEn: true,
                  images: true
                }
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          status: order.status,
          notes: order.notes,
          vendor: {
            id: order.vendor.id,
            store_name: order.vendor.storeName,
            owner_name: order.vendor.user.fullName,
            phone: order.vendor.user.phone
          },
          items: order.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            product: {
              id: item.product.id,
              name_ar: item.product.nameAr,
              name_en: item.product.nameEn,
              image: ensureImagesArray(item.product.images)[0] || null
            }
          })),
          total_amount: order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
          created_at: order.createdAt,
          updated_at: order.updatedAt
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
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get order details
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id
      },
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        vendor: {
          select: {
            id: true,
            storeName: true,
            city: true,
            region: true,
            whatsappNumber: true,
            callNumber: true,
            user: {
              select: {
                fullName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
                images: true,
                age: true,
                weight: true,
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
      data: {
        id: order.id,
        status: order.status,
        notes: order.notes,
        customer: {
          id: order.user.id,
          full_name: order.user.fullName,
          email: order.user.email,
          phone: order.user.phone
        },
        vendor: {
          id: order.vendor.id,
          store_name: order.vendor.storeName,
          owner_name: order.vendor.user.fullName,
          city: order.vendor.city,
          region: order.vendor.region,
          contact: {
            whatsapp: order.vendor.whatsappNumber,
            call: order.vendor.callNumber,
            email: order.vendor.user.email,
            phone: order.vendor.user.phone
          }
        },
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          product: {
            id: item.product.id,
            name_ar: item.product.nameAr,
            name_en: item.product.nameEn,
            images: ensureImagesArray(item.product.images),
            age: item.product.age,
            weight: item.product.weight,
            category: {
              id: item.product.category.id,
              name_ar: item.product.category.nameAr,
              name_en: item.product.category.nameEn
            }
          }
        })),
        total_amount: order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
        created_at: order.createdAt,
        updated_at: order.updatedAt
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Create order
router.post('/create', authenticate, [
  body('vendorId').notEmpty().withMessage('Vendor ID is required'),
  body('items').isArray().notEmpty().withMessage('Items are required'),
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

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, isApproved: true }
    });

    if (!vendor || !vendor.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or not approved'
      });
    }

    const orderItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, price: true, isActive: true, isApproved: true, vendorId: true }
      });

      if (!product || !product.isActive || !product.isApproved) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not available`
        });
      }

      if (product.vendorId !== vendorId) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} does not belong to this vendor`
        });
      }

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        vendorId,
        notes,
        items: {
          create: orderItems
        }
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        created_at: order.createdAt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

// Update order status
router.patch('/:orderId/status', authenticate, [
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

    const { orderId } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Users can only cancel their own orders
    if (status !== 'CANCELLED' && req.user.role === 'USER') {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel orders'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updated_at: updatedOrder.updatedAt
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

module.exports = router;

