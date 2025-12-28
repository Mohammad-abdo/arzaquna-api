const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalProducts,
      pendingApplications,
      pendingProducts,
      totalOrders,
      totalCategories,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.vendor.count({ where: { isApproved: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.vendorApplication.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { isApproved: false, isActive: true } }),
      prisma.order.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalProducts,
        pendingApplications,
        pendingProducts,
        totalOrders,
        totalCategories,
        totalRevenue: totalRevenue._sum.totalAmount || 0
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// Dashboard charts data
router.get('/dashboard/charts', async (req, res) => {
  try {
    // Get orders over last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        createdAt: true,
        totalAmount: true,
        items: {
          select: {
            quantity: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by month
    const ordersByMonth = {};
    orders.forEach(order => {
      const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
      if (!ordersByMonth[month]) {
        ordersByMonth[month] = { orders: 0, revenue: 0 };
      }
      ordersByMonth[month].orders += 1;
      ordersByMonth[month].revenue += order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const ordersOverTime = months.map(month => ({
      month,
      orders: ordersByMonth[month]?.orders || 0,
      revenue: ordersByMonth[month]?.revenue || 0
    }));

    // Get category distribution
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                isApproved: true
              }
            }
          }
        }
      }
    });

    const categoryDistribution = categories
      .map(cat => ({
        name: cat.nameEn,
        value: cat._count.products
      }))
      .filter(cat => cat.value > 0)
      .slice(0, 6);

    // Get user growth over last 6 months
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo
        },
        role: 'USER'
      },
      select: {
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const usersByMonth = {};
    users.forEach(user => {
      const month = new Date(user.createdAt).toLocaleString('default', { month: 'short' });
      usersByMonth[month] = (usersByMonth[month] || 0) + 1;
    });

    const userGrowth = months.map(month => ({
      month,
      users: usersByMonth[month] || 0
    }));

    res.json({
      success: true,
      data: {
        ordersOverTime,
        categoryDistribution,
        userGrowth
      }
    });
  } catch (error) {
    console.error('Get dashboard charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard charts',
      error: error.message
    });
  }
});

// Get pending products for approval
router.get('/products/pending', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isApproved: false,
          isActive: true
        },
        skip,
        take: parseInt(limit),
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          category: true,
          specifications: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({
        where: {
          isApproved: false,
          isActive: true
        }
      })
    ]);

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
    console.error('Get pending products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending products',
      error: error.message
    });
  }
});

// Get all orders (Admin)
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
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
              product: true
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

// Get all messages (Admin)
router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.type = type;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true
            }
          },
          receiver: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Delete user (Admin)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Delete vendor (Admin)
router.delete('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update user role back to USER
    await prisma.user.update({
      where: { id: vendor.userId },
      data: { role: 'USER' }
    });

    // Delete vendor (cascade will handle related data)
    await prisma.vendor.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: error.message
    });
  }
});

// Create admin user
router.post('/users', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['ADMIN', 'USER', 'VENDOR']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { fullName, email, phone, password, role } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Update user role (Admin)
router.put('/users/:id/role', [
  body('role').isIn(['ADMIN', 'USER', 'VENDOR']).withMessage('Invalid role')
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
    const { role } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      }
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
});

// Get all notifications (Admin)
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, userId, isRead } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (isRead !== undefined) where.isRead = isRead === 'true' || isRead === true;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Admin: Create product
router.post('/products', upload.array('images', 10), [
  body('nameAr').trim().notEmpty().withMessage('Arabic name is required'),
  body('nameEn').trim().notEmpty().withMessage('English name is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('vendorId').notEmpty().withMessage('Vendor ID is required'),
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

    const { nameAr, nameEn, categoryId, vendorId, age, weight, descriptionAr, descriptionEn, price, specifications } = req.body;

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId,
        nameAr,
        nameEn,
        age,
        weight,
        descriptionAr,
        descriptionEn,
        price: parseFloat(price),
        images: images,
        isApproved: true, // Admin-created products are auto-approved
        approvedAt: new Date()
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
    if (specifications) {
      try {
        const specsArray = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
        if (Array.isArray(specsArray) && specsArray.length > 0) {
          await Promise.all(
            specsArray.map(spec =>
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
      } catch (specError) {
        console.error('Error adding specifications:', specError);
      }
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
      message: 'Product created successfully',
      data: productWithSpecs
    });
  } catch (error) {
    console.error('Admin create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Admin: Update product
router.put('/products/:id', upload.array('images', 10), [
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
    const { nameAr, nameEn, categoryId, age, weight, descriptionAr, descriptionEn, price, specifications } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = {};
    if (nameAr) updateData.nameAr = nameAr;
    if (nameEn) updateData.nameEn = nameEn;
    if (categoryId) updateData.categoryId = categoryId;
    if (age !== undefined) updateData.age = age;
    if (weight !== undefined) updateData.weight = weight;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (price) updateData.price = parseFloat(price);
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => `/uploads/products/${file.filename}`);
    }
    // Admin updates keep approval status
    updateData.isApproved = true;
    updateData.approvedAt = new Date();

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
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

    // Update specifications if provided
    if (specifications) {
      try {
        // Delete existing specifications
        await prisma.productSpecification.deleteMany({
          where: { productId: id }
        });

        // Add new specifications
        const specsArray = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
        if (Array.isArray(specsArray) && specsArray.length > 0) {
          await Promise.all(
            specsArray.map(spec =>
              prisma.productSpecification.create({
                data: {
                  productId: id,
                  key: spec.key,
                  valueAr: spec.valueAr,
                  valueEn: spec.valueEn
                }
              })
            )
          );
        }
      } catch (specError) {
        console.error('Error updating specifications:', specError);
      }
    }

    const productWithSpecs = await prisma.product.findUnique({
      where: { id },
      include: {
        specifications: true,
        category: true
      }
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: productWithSpecs
    });
  } catch (error) {
    console.error('Admin update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Admin: Create status/offer
router.post('/statuses', upload.single('image'), [
  body('vendorId').notEmpty().withMessage('Vendor ID is required'),
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

    const { vendorId, productId, price, icon, titleAr, titleEn, descriptionAr, descriptionEn } = req.body;

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Handle productId - convert empty string to null
    let finalProductId = productId;
    if (productId === '' || productId === undefined || productId === null) {
      finalProductId = null;
    }

    const status = await prisma.status.create({
      data: {
        vendorId,
        productId: finalProductId,
        image: `/uploads/statuses/${req.file.filename}`,
        price: parseFloat(price),
        icon: icon || null,
        titleAr: titleAr || null,
        titleEn: titleEn || null,
        descriptionAr: descriptionAr || null,
        descriptionEn: descriptionEn || null,
        isActive: true
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
        product: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Status/Offer created successfully',
      data: status
    });
  } catch (error) {
    console.error('Admin create status error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create status',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get reports data
router.get('/reports', async (req, res) => {
  try {
    const { type = '', startDate, endDate } = req.query;
    const reportType = type === 'all' ? '' : type;
    
    let reportData = {};
    let items = [];

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    // Users report
    if (reportType === 'users' || !reportType) {
      try {
        const usersWhere = {};
        if (Object.keys(dateFilter).length > 0) {
          usersWhere.createdAt = dateFilter;
        }

        const users = await prisma.user.findMany({
          where: usersWhere,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        });

        if (reportType === 'users') {
          items = users;
        } else {
          reportData.users = users;
        }
      } catch (error) {
        console.error('Error fetching users report:', error);
        if (reportType === 'users') {
          throw error;
        }
      }
    }

    // Vendors report
    if (reportType === 'vendors' || !reportType) {
      try {
        const vendorsWhere = {};
        if (Object.keys(dateFilter).length > 0) {
          vendorsWhere.createdAt = dateFilter;
        }

        const vendors = await prisma.vendor.findMany({
          where: vendorsWhere,
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                phone: true
              }
            },
            _count: {
              select: {
                products: true,
                statuses: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (reportType === 'vendors') {
          items = vendors;
        } else {
          reportData.vendors = vendors;
        }
      } catch (error) {
        console.error('Error fetching vendors report:', error);
        if (reportType === 'vendors') {
          throw error;
        }
      }
    }

    // Products report
    if (reportType === 'products' || !reportType) {
      try {
        const productsWhere = {};
        if (Object.keys(dateFilter).length > 0) {
          productsWhere.createdAt = dateFilter;
        }

        const products = await prisma.product.findMany({
          where: productsWhere,
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
          },
          orderBy: { createdAt: 'desc' }
        });

        if (reportType === 'products') {
          items = products;
        } else {
          reportData.products = products;
        }
      } catch (error) {
        console.error('Error fetching products report:', error);
        if (reportType === 'products') {
          throw error;
        }
      }
    }

    // Orders report
    if (reportType === 'orders' || !reportType) {
      try {
        const ordersWhere = {};
        if (Object.keys(dateFilter).length > 0) {
          ordersWhere.createdAt = dateFilter;
        }

        const orders = await prisma.order.findMany({
          where: ordersWhere,
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            },
            vendor: {
              include: {
                user: {
                  select: {
                    fullName: true
                  }
                }
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameAr: true,
                    price: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (reportType === 'orders') {
          items = orders;
        } else {
          reportData.orders = orders;
        }
      } catch (error) {
        console.error('Error fetching orders report:', error);
        if (reportType === 'orders') {
          throw error;
        }
      }
    }

    // Summary statistics (only for 'all' reports)
    if (!reportType) {
      try {
        const summaryWhere = {};
        if (Object.keys(dateFilter).length > 0) {
          summaryWhere.createdAt = dateFilter;
        }

        const [
          totalUsers,
          totalVendors,
          totalProducts,
          totalOrders
        ] = await Promise.all([
          prisma.user.count({ 
            where: { 
              role: 'USER',
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            } 
          }),
          prisma.vendor.count({ 
            where: { 
              isApproved: true,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            } 
          }),
          prisma.product.count({ 
            where: { 
              isActive: true,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            } 
          }),
          prisma.order.count({ 
            where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {} 
          })
        ]);

        // Calculate total revenue from order items
        const orderItems = await prisma.orderItem.findMany({
          where: Object.keys(dateFilter).length > 0 ? {
            order: {
              createdAt: dateFilter
            }
          } : {},
          select: {
            price: true,
            quantity: true
          }
        });
        
        const calculatedRevenue = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        reportData.summary = {
          totalUsers,
          totalVendors,
          totalProducts,
          totalOrders,
          totalRevenue: calculatedRevenue
        };
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
    }

    // If specific type requested, return items array
    if (reportType && items.length > 0) {
      reportData.items = items;
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get reports error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Send notification (Admin)
router.post('/notifications', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('type').isIn(['ORDER', 'OFFER', 'MESSAGE']).withMessage('Invalid notification type'),
  body('titleAr').trim().notEmpty().withMessage('Arabic title is required'),
  body('titleEn').trim().notEmpty().withMessage('English title is required'),
  body('messageAr').trim().notEmpty().withMessage('Arabic message is required'),
  body('messageEn').trim().notEmpty().withMessage('English message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId, type, titleAr, titleEn, messageAr, messageEn, data } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        titleAr,
        titleEn,
        messageAr,
        messageEn,
        data: data ? JSON.stringify(data) : null
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

module.exports = router;

