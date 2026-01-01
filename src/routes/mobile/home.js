const express = require('express');
const prisma = require('../../config/database');
const { optionalAuth } = require('../../middleware/auth');
const { getImageUrl } = require('../../utils/jsonHelper');

const router = express.Router();

// Get sliders for home screen
router.get('/sliders', optionalAuth, async (req, res) => {
  try {
    const sliders = await prisma.slider.findMany({
      where: { isActive: true },
      select: {
        id: true,
        image: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        icon: true,
        link: true,
        order: true
      },
      orderBy: { order: 'asc' },
      take: 10 // Limit for mobile
    });

    res.json({
      success: true,
      data: sliders.map(slider => ({
        id: slider.id,
        image: getImageUrl(slider.image),
        title_ar: slider.titleAr,
        title_en: slider.titleEn,
        description_ar: slider.descriptionAr,
        description_en: slider.descriptionEn,
        icon: slider.icon,
        link: slider.link,
        order: slider.order
      }))
    });
  } catch (error) {
    console.error('Get sliders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sliders'
    });
  }
});

// Get categories for home screen
router.get('/categories', optionalAuth, async (req, res) => {
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
      orderBy: { createdAt: 'asc' }
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

// Get featured vendors for home screen
router.get('/featured-vendors', optionalAuth, async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isApproved: true },
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
        },
        _count: {
          select: {
            products: true,
            statuses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10 // Featured vendors limit
    });

    res.json({
      success: true,
      data: vendors.map(vendor => ({
        id: vendor.id,
        store_name: vendor.storeName,
        owner_name: vendor.user.fullName,
        city: vendor.city,
        region: vendor.region,
        phone: vendor.user.phone,
        products_count: vendor._count.products,
        offers_count: vendor._count.statuses
      }))
    });
  } catch (error) {
    console.error('Get featured vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured vendors'
    });
  }
});

// Get latest offers for home screen
router.get('/latest-offers', optionalAuth, async (req, res) => {
  try {
    const statuses = await prisma.status.findMany({
      where: { isActive: true },
      select: {
        id: true,
        image: true,
        price: true,
        icon: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        createdAt: true,
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
      orderBy: { createdAt: 'desc' },
      take: 20 // Latest offers limit
    });

    res.json({
      success: true,
      data: statuses.map(status => ({
        id: status.id,
        image: getImageUrl(status.image),
        price: status.price,
        icon: status.icon,
        title_ar: status.titleAr,
        title_en: status.titleEn,
        description_ar: status.descriptionAr,
        description_en: status.descriptionEn,
        vendor: {
          id: status.vendor.id,
          store_name: status.vendor.storeName,
          owner_name: status.vendor.user.fullName
        },
        created_at: status.createdAt
      }))
    });
  } catch (error) {
    console.error('Get latest offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest offers'
    });
  }
});

module.exports = router;



