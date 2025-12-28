const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        isGuest: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Optional authentication (for guest mode)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          role: true,
          isActive: true,
          isGuest: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Role-based authorization
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is vendor
const isVendor = async (req, res, next) => {
  if (req.user.role !== 'VENDOR') {
    return res.status(403).json({
      success: false,
      message: 'Vendor access required'
    });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
    select: { isApproved: true }
  });

  if (!vendor || !vendor.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Vendor not approved'
    });
  }

  req.vendor = vendor;
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  isVendor
};

